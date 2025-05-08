import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../../styles/theme';

// Web version - just shows a placeholder
const PDFViewer = ({ uri }) => {
  return (
    <View style={styles.pdfWebPlaceholder}>
      <Ionicons name="document-text" size={50} color={COLORS.primary} />
      <Text style={styles.pdfWebText}>PDF Viewer not available on web</Text>
      <Text style={styles.pdfWebSubtext}>Please use iOS or Android app to view PDF documents</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pdfWebPlaceholder: {
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base * 2,
    padding: SIZES.base * 3,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pdfWebText: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: SIZES.base * 2,
  },
  pdfWebSubtext: {
    fontSize: SIZES.small,
    color: '#718096',
    marginTop: SIZES.base,
    textAlign: 'center',
  },
});

export default PDFViewer; 