<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<!-- このコンポーネントの要素のclassは親から利用されるのでむやみに弄らないこと -->
<!-- フォルダの中にはカスタム絵文字だけ（Unicode絵文字もこっち） -->
<section v-if="!hasChildSection" v-panel style="border-radius: 6px; border-bottom: 0.5px solid var(--MI_THEME-divider);">
	<header class="_acrylic" @click="toggleShown()">
		<i class="toggle ti-fw" :class="shown ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i> <slot></slot> (<i class="ti ti-icons"></i>:{{ emojis.length }})
	</header>
	<div v-if="shown" class="body">
		<button
			v-for="emoji in emojis"
			:key="emoji"
			:data-emoji="emoji"
			class="_button item"
			:disabled="disabledEmojis?.value.includes(emoji)"
			@pointerenter="computeButtonTitle"
			@click="emit('chosen', emoji, $event)"
		>
			<MkCustomEmoji v-if="emoji[0] === ':'" class="emoji" :name="emoji" :normal="true" :fallbackToImage="true"/>
			<MkEmoji v-else class="emoji" :emoji="emoji" :normal="true"/>
		</button>
	</div>
</section>
<!-- フォルダの中にはカスタム絵文字やフォルダがある -->
<section v-else v-panel style="border-radius: 6px; border-bottom: 0.5px solid var(--MI_THEME-divider);">
	<header class="_acrylic" @click="toggleShown()">
		<i class="toggle ti-fw" :class="shown ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i> <slot></slot> (<i class="ti ti-folder ti-fw"></i>:{{ customEmojiTree?.length }} <i class="ti ti-icons ti-fw"></i>:{{ emojis.length }})
	</header>
	<div v-if="shown" style="padding-left: 9px;">
		<MkEmojiPickerSection
			v-for="child in visibleChildTree"
			:key="`custom:${child.value}`"
			:initialShown="initialShown"
			:emojis="computed(() => visibleCustomEmojis.filter(e => e.category === child.category).map(e => `:${e.name}:`))"
			:hasChildSection="child.children.length !== 0"
			:customEmojiTree="child.children"
			@chosen="nestedChosen"
		>
			{{ child.value || i18n.ts.other }}
		</MkEmojiPickerSection>
	</div>
	<div v-if="shown" class="body">
		<button
			v-for="emoji in emojis"
			:key="emoji"
			:data-emoji="emoji"
			class="_button item"
			:disabled="disabledEmojis?.value.includes(emoji)"
			@pointerenter="computeButtonTitle"
			@click="emit('chosen', emoji, $event)"
		>
			<MkCustomEmoji v-if="emoji[0] === ':'" class="emoji" :name="emoji" :normal="true"/>
			<MkEmoji v-else class="emoji" :emoji="emoji" :normal="true"/>
		</button>
	</div>
</section>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { getEmojiName } from '@@/js/emojilist.js';
import type { Ref } from 'vue';
import type { CustomEmojiFolderTree } from '@@/js/emojilist.js';
import { i18n } from '@/i18n.js';
import { customEmojis } from '@/custom-emojis.js';
import { prefer } from '@/preferences.js';
import { isCustomEmojiVisible } from '@/utility/emoji-category-visibility.js';
import MkEmojiPickerSection from '@/components/MkEmojiPicker.section.vue';

const props = defineProps<{
	emojis: string[] | Ref<string[]>;
	disabledEmojis?: Ref<string[]>;
	initialShown?: boolean;
	hasChildSection?: boolean;
	customEmojiTree?: CustomEmojiFolderTree[];
	/** 展開状態を記憶するための一意キー */
	stateKey?: string;
}>();

const emit = defineEmits<{
	(ev: 'chosen', v: string, event: PointerEvent): void;
}>();

const emojis = computed(() => Array.isArray(props.emojis) ? props.emojis : props.emojis.value);

const visibleCustomEmojis = computed(() => customEmojis.value.filter(isCustomEmojiVisible));

function subtreeHasVisibleEmoji(node: CustomEmojiFolderTree): boolean {
	if (visibleCustomEmojis.value.some(e => e.category === node.category)) return true;
	return node.children.some(child => subtreeHasVisibleEmoji(child));
}

const visibleChildTree = computed(() => (props.customEmojiTree ?? []).filter(subtreeHasVisibleEmoji));

function resolveInitialShown(): boolean {
	const mode = prefer.s.emojiPickerExpandMode;
	if (mode === 'all') return true;
	if (mode === 'default') return !!props.initialShown;
	if (props.stateKey != null && prefer.s.emojiPickerExpandedCategories.includes(props.stateKey)) return true;
	return !!props.initialShown;
}

const shown = ref(resolveInitialShown());

function toggleShown(): void {
	shown.value = !shown.value;
	if (prefer.s.emojiPickerExpandMode !== 'remember' || props.stateKey == null) return;
	const set = new Set(prefer.s.emojiPickerExpandedCategories);
	if (shown.value) set.add(props.stateKey);
	else set.delete(props.stateKey);
	prefer.commit('emojiPickerExpandedCategories', [...set]);
}

/** @see MkEmojiPicker.vue */
function computeButtonTitle(ev: PointerEvent): void {
	const elm = ev.target as HTMLElement;
	const emoji = elm.dataset.emoji as string;
	elm.title = getEmojiName(emoji);
}

function nestedChosen(emoji: string, ev: PointerEvent) {
	emit('chosen', emoji, ev);
}
</script>
