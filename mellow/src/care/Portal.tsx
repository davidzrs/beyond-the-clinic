// Phones: the care team portal is a web dashboard, so the app points clinicians to the website.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { exitPortal } from './exit';
import { F } from '../theme';

export function CarePortal() {
  return (
    <View style={st.wrap}>
      <Text style={st.h}>Care team portal</Text>
      <Text style={st.p}>The clinician dashboard is made for a bigger screen. Open the Mellow website on a computer and choose “Are you a doctor?” on the sign-in page.</Text>
      <Pressable onPress={exitPortal} accessibilityRole="button" style={st.btn}><Text style={st.btnT}>Back to Mellow</Text></Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f2f6fb', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  h: { fontFamily: F.displayBold, fontSize: 24, color: '#16233a' },
  p: { fontFamily: F.body, fontSize: 15.5, color: '#44546c', textAlign: 'center', maxWidth: 360, lineHeight: 22 },
  btn: { backgroundColor: '#2a6db0', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 22, minHeight: 44, justifyContent: 'center' },
  btnT: { fontFamily: F.bodyBold, fontSize: 15, color: '#ffffff' },
});
