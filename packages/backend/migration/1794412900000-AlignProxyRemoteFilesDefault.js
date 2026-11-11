/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AlignProxyRemoteFilesDefault1794412900000 {
    name = 'AlignProxyRemoteFilesDefault1794412900000';

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "proxyRemoteFiles" SET DEFAULT true`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "proxyRemoteFiles" SET DEFAULT false`);
    }
}
