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

			<div :class="$style.syncList">
				<div :class="$style.syncRow">
					<div :class="$style.syncLabel"><i class="ti ti-cloud-cog"></i> {{ i18n.ts._emojiCategorySettings.syncOverrides }}</div>
					<MkSwitch :modelValue="syncOverrides" @update:modelValue="(v: boolean) => setSync('emojiCategoryOverrides', v)"/>
				</div>
				<div :class="$style.syncRow">
					<div :class="$style.syncLabel"><i class="ti ti-cloud-cog"></i> {{ i18n.ts._emojiCategorySettings.syncExpanded }}</div>
					<MkSwitch :modelValue="syncExpanded" @update:modelValue="(v: boolean) => setSync('emojiPickerExpandedCategories', v)"/>
				</div>
				<div :class="$style.syncHint">{{ i18n.ts._emojiCategorySettings.syncHint }}</div>
			</div>

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
import { computed, ref, useTemplateRef } from 'vue';
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
	get: () => prefer.r.emojiPickerExpandMode.value,
	set: (v) => { prefer.commit('emojiPickerExpandMode', v); },
});

// prefer.s は非リアクティブなので、UI更新には prefer.r (ref) を参照する
const overrides = prefer.r.emojiCategoryOverrides;

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
	const current = overrides.value ?? {};
	if (Object.prototype.hasOwnProperty.call(current, category)) return current[category] !== false;
	return isDefaultVisible(category);
}

function toggle(category: string, visible: boolean): void {
	const next = { ...(overrides.value ?? {}) };
	if (visible === isDefaultVisible(category)) {
		delete next[category];
	} else {
		next[category] = visible;
	}
	prefer.commit('emojiCategoryOverrides', next);
}

const hasOverrides = computed(() => Object.keys(overrides.value ?? {}).length > 0);

const syncOverrides = ref(prefer.isSyncEnabled('emojiCategoryOverrides'));
const syncExpanded = ref(prefer.isSyncEnabled('emojiPickerExpandedCategories'));

async function setSync(key: 'emojiCategoryOverrides' | 'emojiPickerExpandedCategories', enabled: boolean): Promise<void> {
	if (enabled) {
		const res = await prefer.enableSync(key as any);
		const state = prefer.isSyncEnabled(key as any);
		if (key === 'emojiCategoryOverrides') syncOverrides.value = state;
		else syncExpanded.value = state;
	} else {
		prefer.disableSync(key as any);
		if (key === 'emojiCategoryOverrides') syncOverrides.value = false;
		else syncExpanded.value = false;
	}
}

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

.syncList {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border: 0.5px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
}

.syncRow {
	display: flex;
	align-items: center;
	gap: 12px;
}

.syncLabel {
	flex: 1;
	min-width: 0;
	display: flex;
	gap: 8px;
	align-items: center;
}

.syncHint {
	font-size: 0.8em;
	opacity: 0.6;
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
