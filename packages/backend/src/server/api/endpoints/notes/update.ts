/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '@/server/api/error.js';
import { MAX_NOTE_TEXT_LENGTH } from '@/const.js';
import { NoteUpdateService } from '@/core/NoteUpdateService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { trackPromise } from '@/misc/promise-tracker.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	kind: 'write:notes',

	limit: {
		duration: ms('1hour'),
		max: 100,
		minInterval: ms('1sec'),
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			updatedNote: {
				type: 'object',
				optional: false, nullable: false,
				ref: 'Note',
			},
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'a6584e14-6e01-4ad3-b566-851e7bf0d474',
		},

		cannotEdit: {
			message: 'You cannot edit this note.',
			code: 'CANNOT_EDIT_NOTE',
			id: 'c7f2a1d4-8b3e-4f5a-9d6c-2e1b0a3f8c57',
		},

		noContent: {
			message: 'A note must have text, files, or a renote.',
			code: 'NO_CONTENT',
			id: '0bee35b5-4dfa-4a0b-a9b7-34d69c4938e1',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
		text: {
			type: 'string',
			nullable: true,
			maxLength: MAX_NOTE_TEXT_LENGTH,
		},
		cw: { type: 'string', nullable: true, maxLength: 100 },
	},
	required: ['noteId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private getterService: GetterService,
		private noteEntityService: NoteEntityService,
		private noteUpdateService: NoteUpdateService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch(err => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			if (note.userId !== me.id) {
				throw new ApiError(meta.errors.cannotEdit);
			}

			const text = ps.text !== undefined ? ps.text : note.text;
			const cw = ps.cw !== undefined ? ps.cw : note.cw;

			if (text == null && cw == null && note.renoteId == null) {
				const hasFiles = note.fileIds.length > 0;
				if (!hasFiles) throw new ApiError(meta.errors.noContent);
			}

			await this.noteUpdateService.updateNote(note, { text, cw });

			trackPromise(this.noteUpdateService.deliverUpdate(note));

			return {
				updatedNote: await this.noteEntityService.pack(note, me),
			};
		});
	}
}
