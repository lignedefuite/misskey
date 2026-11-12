/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class DefaultHiddenEmojiCategories1794420000000 {
    name = 'DefaultHiddenEmojiCategories1794420000000';

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "defaultHiddenEmojiCategories" character varying(256) array NOT NULL DEFAULT '{}'`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "defaultHiddenEmojiCategories"`);
    }
}
