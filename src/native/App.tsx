import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameScreen from './GameScreen';

export default function App() {
  return <SafeAreaProvider><StatusBar hidden /><GameScreen /></SafeAreaProvider>;
}
