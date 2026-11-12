<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div class="_gaps_m">
		<MkTextarea v-model="categories">
			<template #label>{{ i18n.ts._emojiCategorySettings.adminTitle }}</template>
			<template #caption>{{ i18n.ts._emojiCategorySettings.adminCaption }}</template>
		</MkTextarea>
		<div>
			<MkButton primary :disabled="saving" @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const categories = ref('');
const saving = ref(false);

onMounted(async () => {
	const meta = await misskeyApi('admin/meta');
	categories.value = (meta.defaultHiddenEmojiCategories ?? []).join('\n');
});

async function save(): Promise<void> {
	saving.value = true;
	try {
		const list = [...new Set(categories.value
			.split(/[\n,]/g)
			.map(x => x.trim())
			.filter(x => x !== ''))];
		await os.apiWithDialog('admin/update-meta', {
			defaultHiddenEmojiCategories: list,
		});
		categories.value = list.join('\n');
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="css" module>
.root {
	padding: 24px;
	max-width: 800px;
	height: calc(100dvh - var(--MI-stickyTop) - var(--MI-stickyBottom));
	overflow-y: auto;
	box-sizing: border-box;
}
</style>
