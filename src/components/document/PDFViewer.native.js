import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Pdf from 'react-native-pdf';
import { COLORS, SIZES } from '../../styles/theme';

const PDFViewer = ({ uri }) => {
  return (
    <View style={styles.pdfContainer}>
      <Pdf
        source={{ uri }}
        style={styles.pdf}
        onLoadComplete={(numberOfPages) => {
          console.log(`Loaded ${numberOfPages} pages`);
        }}
        onError={(error) => {
          console.error('PDF loading error:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pdfContainer: {
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: 400,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width - (SIZES.base * 4),
    height: '100%',
    borderRadius: SIZES.radius,
  },
});

export default PDFViewer; 