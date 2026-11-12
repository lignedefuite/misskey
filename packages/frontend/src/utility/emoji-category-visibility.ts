/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { instance } from '@/instance.js';
import { prefer } from '@/preferences.js';

/**
 * カテゴリがユーザーに対して表示されるか
 * - ユーザー個別の上書き (emojiCategoryOverrides) が最優先
 * - なければインスタンスの既定 (defaultHiddenEmojiCategories)、前方一致でサブツリーも隠せる
 */
export function isCategoryVisible(category: string | null | undefined): boolean {
	if (category == null || category === '' || category === 'null') return true;

	const overrides = prefer.s.emojiCategoryOverrides;
	if (overrides != null && Object.prototype.hasOwnProperty.call(overrides, category)) {
		return overrides[category] !== false;
	}

	const defaults = instance.defaultHiddenEmojiCategories ?? [];
	for (const d of defaults) {
		if (d == null || d === '') continue;
		if (category === d) return false;
		const prefix = d.endsWith('/') ? d : d + '/';
		if (category.startsWith(prefix)) return false;
	}

	return true;
}

export function isCustomEmojiVisible(emoji: { category?: string | null }): boolean {
	return isCategoryVisible(emoji.category ?? null);
}
