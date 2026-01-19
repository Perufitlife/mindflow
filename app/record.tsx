import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RecordScreen() {
  const router = useRouter();

  const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);

  // Timer simple
  React.useEffect(() => {
    let interval: any;

    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  async function startRecording() {
    try {
      // Pedir permiso de micrófono
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Please enable microphone access to record.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Could not start recording.');
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      console.log('Recording saved at:', uri);
      
      // TODO: aquí luego mandaremos el audio a la IA
      setRecording(null);
      
      // Pasamos el audioUri como parámetro a la siguiente pantalla
      router.push({
        pathname: '/processing',
        params: { audioUri: uri || '' },
      });
      
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Could not stop recording.');
    }
  }

  const handleRecordPress = () => {
    if (isRecording) {
      // segundo tap: STOP
      stopRecording();
    } else {
      // primer tap: START
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(seconds)}</Text>

      <View style={styles.center}>
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={handleRecordPress}
        />
        <Text style={styles.helper}>
          {isRecording ? 'Tap to stop recording' : 'Tap to start talking'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    paddingTop: 80,
  },
  timer: {
    fontSize: 22,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FF6F61',
    marginBottom: 24,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30', // rojo iOS “grabando”
  },
  helper: {
    fontSize: 16,
    color: '#333',
  },
});
