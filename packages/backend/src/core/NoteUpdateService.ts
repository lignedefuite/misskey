/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import type { NotesRepository, UsersRepository, MiNote } from '@/models/_.js';
import type { MiLocalUser, MiRemoteUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { RelayService } from '@/core/RelayService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { bindThis } from '@/decorators.js';
import Logger from '@/logger.js';

export type NoteUpdateParams = {
	text: string | null;
	cw: string | null;
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
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private relayService: RelayService,
	) {
		this.logger = new Logger('note-update');
	}

	/**
	 * ノートの本文・CWを更新し、ストリーミングでクライアントへ通知する
	 */
	@bindThis
	public async updateNote(note: MiNote, params: NoteUpdateParams): Promise<MiNote> {
		const updatedAt = new Date();

		await this.notesRepository.update(note.id, {
			text: params.text,
			cw: params.cw,
			updatedAt,
		});

		note.text = params.text;
		note.cw = params.cw;
		note.updatedAt = updatedAt;

		this.globalEventService.publishNoteStream(note, 'updated', {
			text: params.text ?? '',
			cw: params.cw,
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
