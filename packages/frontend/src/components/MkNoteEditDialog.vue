<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow ref="dialog" @close="emit('closed')" @closed="emit('closed')">
	<template #header>{{ i18n.ts.edit }}</template>

	<div :class="$style.root">
		<div :class="$style.cw">
			<MkSwitch v-model="useCw">{{ i18n.ts.contentWarning }}</MkSwitch>
			<MkInput v-if="useCw" v-model="cw" :maxLength="100">
				<template #label>{{ i18n.ts.contentWarning }}</template>
			</MkInput>
		</div>

		<MkTextarea v-model="text" :maxLength="maxTextLength" :autofocus="!useCw">
			<template #label>{{ i18n.ts.text }}</template>
		</MkTextarea>

		<div :class="$style.footer">
			<MkButton primary :disabled="saving" @click="save()">{{ i18n.ts.save }}</MkButton>
			<MkButton :disabled="saving" @click="emit('closed')">{{ i18n.ts.cancel }}</MkButton>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkButton from '@/components/MkButton.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';

const props = defineProps<{
	note: Misskey.entities.Note;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
	(ev: 'updated', note: Misskey.entities.Note): void;
}>();

const dialog = useTemplateRef('dialog');

const maxTextLength = instance.maxNoteTextLength;
const text = ref<string>(props.note.text ?? '');
const cw = ref<string>(props.note.cw ?? '');
const useCw = ref<boolean>(props.note.cw != null);
const saving = ref(false);

async function save(): Promise<void> {
	if (saving.value) return;
	saving.value = true;
	try {
		const res = await misskeyApi('notes/update', {
			noteId: props.note.id,
			text: text.value === '' ? null : text.value,
			cw: useCw.value ? cw.value : null,
		});
		props.note.text = res.updatedNote.text;
		props.note.cw = res.updatedNote.cw;
		props.note.updatedAt = res.updatedNote.updatedAt;
		emit('updated', res.updatedNote);
		emit('closed');
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" module>
.root {
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cw {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.footer {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}
</style>
