<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="520"
	:height="640"
	:withCloseButton="true"
	@click="close()"
	@close="close()"
	@closed="emit('closed')"
>
	<template #header>{{ i18n.ts._emojiCategorySettings.title }}</template>
	<div :class="$style.body">
		<div class="_gaps_m">
			<MkRadios v-model="expandMode" :options="expandOptions">
				<template #label>{{ i18n.ts._emojiCategorySettings.expandMode }}</template>
			</MkRadios>

			<MkInfo>{{ i18n.ts._emojiCategorySettings.description }}</MkInfo>

			<div :class="$style.list">
				<div v-for="cat in categories" :key="cat" :class="$style.row">
					<div :class="$style.labelWrap">
						<span :class="$style.label">{{ cat }}</span>
						<span :class="[$style.badge, { [$style.badgeHidden]: !isDefaultVisible(cat) }]">{{ isDefaultVisible(cat) ? i18n.ts._emojiCategorySettings.defaultVisible : i18n.ts._emojiCategorySettings.defaultHidden }}</span>
					</div>
					<MkSwitch :modelValue="isVisible(cat)" @update:modelValue="(v: boolean) => toggle(cat, v)"/>
				</div>
			</div>

			<MkButton v-if="hasOverrides" @click="resetAll"><i class="ti ti-rotate"></i> {{ i18n.ts._emojiCategorySettings.reset }}</MkButton>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { computed, useTemplateRef } from 'vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { prefer } from '@/preferences.js';
import { customEmojis } from '@/custom-emojis.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const dialog = useTemplateRef('dialog');

const expandOptions = computed(() => [
	{ value: 'remember', label: i18n.ts._emojiCategorySettings.expandModeRemember },
	{ value: 'all', label: i18n.ts._emojiCategorySettings.expandModeAll },
	{ value: 'default', label: i18n.ts._emojiCategorySettings.expandModeDefault },
]);

const expandMode = computed({
	get: () => prefer.s.emojiPickerExpandMode,
	set: (v) => { prefer.commit('emojiPickerExpandMode', v); },
});

const categories = computed(() => {
	const set = new Set<string>();
	for (const emoji of customEmojis.value) {
		if (emoji.category && emoji.category !== 'null') set.add(emoji.category);
	}
	return [...set].sort((a, b) => a.localeCompare(b));
});

function isDefaultVisible(category: string): boolean {
	const defaults = instance.defaultHiddenEmojiCategories ?? [];
	for (const d of defaults) {
		if (d == null || d === '') continue;
		if (category === d) return false;
		const prefix = d.endsWith('/') ? d : d + '/';
		if (category.startsWith(prefix)) return false;
	}
	return true;
}

function isVisible(category: string): boolean {
	const overrides = prefer.s.emojiCategoryOverrides ?? {};
	if (Object.prototype.hasOwnProperty.call(overrides, category)) return overrides[category] !== false;
	return isDefaultVisible(category);
}

function toggle(category: string, visible: boolean): void {
	const next = { ...(prefer.s.emojiCategoryOverrides ?? {}) };
	if (visible === isDefaultVisible(category)) {
		delete next[category];
	} else {
		next[category] = visible;
	}
	prefer.commit('emojiCategoryOverrides', next);
}

const hasOverrides = computed(() => Object.keys(prefer.s.emojiCategoryOverrides ?? {}).length > 0);

function resetAll(): void {
	prefer.commit('emojiCategoryOverrides', {});
}

function close(): void {
	dialog.value?.close();
}
</script>

<style lang="scss" module>
.body {
	padding: 16px 20px 24px;
	overflow-y: auto;
	height: 100%;
	box-sizing: border-box;
}

.list {
	display: flex;
	flex-direction: column;
	border: 0.5px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
}

.row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	&:not(:last-child) {
		border-bottom: 0.5px solid var(--MI_THEME-divider);
	}
}

.labelWrap {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
	flex: 1;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	font-size: 0.75em;
	opacity: 0.6;
}

.badgeHidden {
	color: var(--MI_THEME-warn);
	opacity: 0.9;
}
</style>
