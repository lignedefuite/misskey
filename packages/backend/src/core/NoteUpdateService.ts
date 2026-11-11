/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as mfm from 'mfm-js';
import { In } from 'typeorm';
import type { NotesRepository, UsersRepository, MiNote } from '@/models/_.js';
import type { MiLocalUser, MiRemoteUser } from '@/models/User.js';
import type { MiDriveFile } from '@/models/DriveFile.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { RelayService } from '@/core/RelayService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { extractHashtags } from '@/misc/extract-hashtags.js';
import { extractCustomEmojisFromMfm } from '@/misc/extract-custom-emojis-from-mfm.js';
import { normalizeTag } from '@/misc/normalize-tag.js';
import { bindThis } from '@/decorators.js';
import Logger from '@/logger.js';

export type NoteUpdateParams = {
	text: string | null;
	cw: string | null;
	/** 指定した場合のみ添付を差し替える */
	fileIds?: string[];
	files?: MiDriveFile[];
};

@Injectable()
export class NoteUpdateService {
	private logger: Logger;

	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private globalEventService: GlobalEventService,
		private userEntityService: UserEntityService,
		private driveFileEntityService: DriveFileEntityService,
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private relayService: RelayService,
	) {
		this.logger = new Logger('note-update');
	}

	@bindThis
	public async updateNote(note: MiNote, params: NoteUpdateParams): Promise<MiNote> {
		const updatedAt = new Date();
		const tokens = mfm.parse(params.text ?? '');
		const tags = extractHashtags(tokens).map(tag => normalizeTag(tag));
		const emojis = extractCustomEmojisFromMfm(tokens);

		const patch: Record<string, unknown> = {
			text: params.text,
			cw: params.cw,
			tags,
			emojis,
			updatedAt,
		};

		if (params.fileIds != null) {
			patch.fileIds = params.fileIds;
			patch.attachedFileTypes = (params.files ?? []).map(f => f.type);
		}

		await this.notesRepository.update(note.id, patch);

		note.text = params.text;
		note.cw = params.cw;
		note.tags = tags;
		note.emojis = emojis;
		note.updatedAt = updatedAt;
		if (params.fileIds != null) {
			note.fileIds = params.fileIds;
			note.attachedFileTypes = (params.files ?? []).map(f => f.type);
		}

		const packedFiles = params.fileIds != null
			? await this.driveFileEntityService.packManyByIds(params.fileIds)
			: undefined;

		this.globalEventService.publishNoteStream(note, 'updated', {
			cw: params.cw,
			text: params.text ?? '',
			updatedAt: updatedAt.toISOString(),
			tags,
			emojis,
			...(params.fileIds != null ? { fileIds: params.fileIds, files: packedFiles } : {}),
		});

		return note;
	}

	/**
	 * 編集内容を連合先へ Update アクティビティとして配送する（ローカルのみ）
	 */
	@bindThis
	public async deliverUpdate(note: MiNote): Promise<void> {
		try {
			const user = note.user ?? await this.usersRepository.findOneBy({ id: note.userId });
			if (user == null) return;
			if (!this.userEntityService.isLocalUser(user)) return;
			if (note.localOnly) return;

			const object = await this.apRendererService.renderNote(note, false);
			const activity = this.apRendererService.renderUpdate(object, user as MiLocalUser);

			const dm = this.apDeliverManagerService.createDeliverManager(user as MiLocalUser, activity);

			if (note.visibility === 'specified') {
				const targets = note.visibleUserIds.length > 0
					? await this.usersRepository.findBy({ id: In(note.visibleUserIds) })
					: [];
				for (const u of targets) {
					if (u.host != null) dm.addDirectRecipe(u as MiRemoteUser);
				}
			} else {
				dm.addFollowersRecipe();
				if (note.visibility === 'public') {
					this.relayService.deliverToRelays(user as MiLocalUser, activity);
				}
			}

			await dm.execute();
		} catch (err) {
			this.logger.error('failed to deliver note update: ' + err);
		}
	}
}
