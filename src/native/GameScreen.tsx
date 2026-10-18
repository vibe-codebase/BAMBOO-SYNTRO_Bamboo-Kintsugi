import { useEffect, useRef } from 'react';
import { AppState, BackHandler, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview';

type WebToNative = { type: 'haptic'; style: 'light' | 'medium' | 'success' | 'warning' } | { type: 'exit' };

const HAPTIC_MS = { light: 10, medium: 22, success: 34, warning: 48 } as const;
/** The game ships inside the app and runs fully offline from the APK's own assets. */
const GAME_URI = 'file:///android_asset/www/index.html';
const LOCAL = 'file:///android_asset/';
const BG = '#1b1512';

function send(message: object): string {
  return `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(message))}}));true;`;
}

export default function GameScreen() {
  const web = useRef<WebViewType>(null);
  // keep the game clear of display cutouts and the navigation bar on every screen shape
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const app = AppState.addEventListener('change', (s) => web.current?.injectJavaScript(send({ type: 'native.lifecycle', state: s === 'active' ? 'active' : 'background' })));
    const back = BackHandler.addEventListener('hardwareBackPress', () => { web.current?.injectJavaScript(send({ type: 'native.back' })); return true; });
    return () => { app.remove(); back.remove(); };
  }, []);
  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(event.nativeEvent.data) as WebToNative;
      if (m.type === 'haptic') Vibration.vibrate(HAPTIC_MS[m.style] ?? 12);
      else if (m.type === 'exit') BackHandler.exitApp();
    } catch { /* ignore malformed messages */ }
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <WebView ref={web} source={{ uri: GAME_URI }} originWhitelist={['file://*']}
        // only the bundled game may load: no remote pages, no new windows
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(LOCAL)} setSupportMultipleWindows={false}
        javaScriptEnabled domStorageEnabled allowFileAccess allowFileAccessFromFileURLs allowingReadAccessToURL={LOCAL}
        mixedContentMode="never" geolocationEnabled={false} webviewDebuggingEnabled={false} textZoom={100}
        overScrollMode="never" bounces={false} androidLayerType="hardware" mediaPlaybackRequiresUserAction={false}
        style={styles.web} onMessage={onMessage} />
    </View>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: BG }, web: { flex: 1, backgroundColor: BG } });
