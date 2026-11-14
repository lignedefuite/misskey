<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="hasDisconnected && prefer.s.serverDisconnectedBehavior === 'quiet'" :class="$style.root" class="_panel _shadow" @click="resetDisconnected">
	<div><i class="ti ti-alert-triangle"></i> {{ i18n.ts.disconnectedFromServer }}</div>
	<div :class="$style.command" class="_buttons">
		<MkButton small primary @click="reload">{{ i18n.ts.reload }}</MkButton>
		<MkButton small>{{ i18n.ts.doNothing }}</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue';
import { useStream } from '@/stream.js';
import { i18n } from '@/i18n.js';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { prefer } from '@/preferences.js';
import { store } from '@/store.js';

const zIndex = os.claimZIndex('high');

// 一時的な切断で不安を煽らないよう、3秒以上戻らない場合だけ表示する
const DISCONNECTED_DISPLAY_DELAY = 1000 * 3;

const hasDisconnected = ref(false);
let disconnectedTimerId: number | null = null;

function onDisconnected() {
	if (disconnectedTimerId != null || hasDisconnected.value) return;
	disconnectedTimerId = window.setTimeout(() => {
		disconnectedTimerId = null;
		if (useStream().state === 'connected') return;
		hasDisconnected.value = true;
	}, DISCONNECTED_DISPLAY_DELAY);
}

function onConnected() {
	if (disconnectedTimerId != null) {
		window.clearTimeout(disconnectedTimerId);
		disconnectedTimerId = null;
	}
	hasDisconnected.value = false;
}

function resetDisconnected() {
	hasDisconnected.value = false;
}

function reload() {
	window.location.reload();
}

if (store.s.realtimeMode) {
	const stream = useStream();
	stream.on('_disconnected_', onDisconnected);
	stream.on('_connected_', onConnected);

	onUnmounted(() => {
		if (disconnectedTimerId != null) {
			window.clearTimeout(disconnectedTimerId);
			disconnectedTimerId = null;
		}
		stream.off('_disconnected_', onDisconnected);
		stream.off('_connected_', onConnected);
	});
}
</script>

<style lang="scss" module>
.root {
	position: fixed;
	z-index: v-bind(zIndex);
	bottom: calc(var(--MI-minBottomSpacing) + var(--MI-margin));
	right: var(--MI-margin);
	margin: 0;
	padding: 12px;
	font-size: 0.9em;
	max-width: 320px;
}

.command {
	margin-top: 8px;
}
</style>
