/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';
import { miLocalStorage } from '@/local-storage.js';
import { instance } from '@/instance.js';

export const UI_STYLES = ['abyss', 'voltage', 'glass', 'wasteland'] as const;

export type UiStyle = typeof UI_STYLES[number];

const LS_KEY = 'uiStyle';

function isUiStyle(v: unknown): v is UiStyle {
	return typeof v === 'string' && (UI_STYLES as readonly string[]).includes(v);
}

/** 用户手动选择的外观（null = 跟随实例默认） */
export const uiStyleOverride = ref<UiStyle | null>(isUiStyle(miLocalStorage.getItem(LS_KEY)) ? miLocalStorage.getItem(LS_KEY) as UiStyle : null);

/** 当前实际生效的外观 */
export const uiStyle = ref<UiStyle>('abyss');

export function resolveUiStyle(): UiStyle {
	if (uiStyleOverride.value != null) return uiStyleOverride.value;
	const fromInstance = (instance as { defaultUiStyle?: string }).defaultUiStyle;
	if (isUiStyle(fromInstance)) return fromInstance;
	return 'abyss';
}

/** 应用外观到 <html data-ui-style="..."> */
export function applyUiStyle(style?: UiStyle): void {
	const next = style ?? resolveUiStyle();
	uiStyle.value = next;
	if (typeof window !== 'undefined') {
		window.document.documentElement.dataset.uiStyle = next;
	}
}

/** 用户切换外观；传 null 表示恢复为实例默认 */
export function setUiStyle(style: UiStyle | null): void {
	if (style == null) {
		uiStyleOverride.value = null;
		miLocalStorage.removeItem(LS_KEY);
	} else {
		uiStyleOverride.value = style;
		miLocalStorage.setItem(LS_KEY, style);
	}
	applyUiStyle();
}

// 尽早应用（使用 localStorage 缓存的 instance），避免首屏闪烁
applyUiStyle();
