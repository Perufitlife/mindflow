import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

export default function ProcessingScreen() {
  const router = useRouter();
  const { audioUri } = useLocalSearchParams();

  React.useEffect(() => {
    // Simulamos "procesar audio con IA"
    if (!audioUri || typeof audioUri !== 'string') {
      Alert.alert(
        'Error',
        'We could not find your recording. Please try again.'
      );
      router.replace('/record');
      return;
    }

    console.log('Processing audio from:', audioUri);

    const timeout = setTimeout(() => {
      // Aquí en el futuro llamaremos a la API real.
      // De momento, generamos un análisis fake pero creíble.
      const summary =
        "You’re feeling overwhelmed with your tasks but you know exactly what matters most if you slow down and focus.";
      const mood = 'Overwhelmed';
      const insights = [
        'You have too many open loops in your head.',
        'You’re mixing urgent tasks with important ones.',
        'You feel guilty for not moving faster, but you’re already doing a lot.',
      ];
      const actions = [
        'Write down your top 3 priorities for tomorrow.',
        'Block 30 minutes to clean your task list.',
        'Decide one thing you will NOT do this week.',
      ];

      router.replace({
        pathname: '/output',
        params: {
          summary,
          mood,
          insights: JSON.stringify(insights),
          actions: JSON.stringify(actions),
          audioUri: audioUri,
        },
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [audioUri, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Processing your thoughts…</Text>
      <Text style={styles.sub}>
        Turning your words into summary, insights and actions.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    marginTop: 24,
    fontSize: 18,
  },
  sub: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
});
