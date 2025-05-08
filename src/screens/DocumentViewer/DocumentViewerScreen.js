import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Platform,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Header from '../../components/layout/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getDocumentById, deleteDocument } from '../../services/DocumentService';
import PDFViewer from '../../components/document/PDFViewer';

const DocumentViewerScreen = ({ navigation, route }) => {
  const { documentId } = route.params;
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJargon, setShowJargon] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [viewMode, setViewMode] = useState('parsed'); // 'parsed' or 'original'

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const data = await getDocumentById(documentId);
      setDocument(data);
      
      // Check if the document is a PDF
      if (data.image && data.image.toLowerCase().endsWith('.pdf')) {
        setIsPdf(true);
      }
    } catch (error) {
      console.error('Error loading document:', error);
      Alert.alert(
        'Error',
        'Could not load document. Please try again later.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'prescription':
        return 'medkit-outline';
      case 'lab':
        return 'flask-outline';
      case 'insurance':
        return 'card-outline';
      case 'notes':
        return 'clipboard-outline';
      default:
        return 'document-text-outline';
    }
  };

  const renderToggleViewButton = () => {
    if (!document || !document.image) return null;
    
    return (
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity 
          style={[
            styles.viewToggleButton, 
            viewMode === 'parsed' && styles.viewToggleButtonActive
          ]}
          onPress={() => setViewMode('parsed')}
        >
          <Text style={[
            styles.viewToggleText,
            viewMode === 'parsed' && styles.viewToggleTextActive
          ]}>
            Simplified
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.viewToggleButton, 
            viewMode === 'original' && styles.viewToggleButtonActive
          ]}
          onPress={() => setViewMode('original')}
        >
          <Text style={[
            styles.viewToggleText,
            viewMode === 'original' && styles.viewToggleTextActive
          ]}>
            Original
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDocumentImage = () => {
    if (!document || !document.image) return null;

    // Only show the document image if in 'original' view mode or if there's no parsed content
    if (viewMode === 'original' || !document.content || Object.keys(document.content).length === 0) {
      if (isPdf) {
        return <PDFViewer uri={document.image} />;
      } else {
        return (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: document.image }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          </View>
        );
      }
    }
    
    return null;
  };

  const renderPrescriptionContent = (content) => (
    <View style={styles.contentSection}>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Medication:</Text>
        <Text style={styles.contentValue}>{content.medication || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Dosage:</Text>
        <Text style={styles.contentValue}>{content.dosage || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Frequency:</Text>
        <Text style={styles.contentValue}>{content.frequency || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Duration:</Text>
        <Text style={styles.contentValue}>{content.duration || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Prescribed By:</Text>
        <Text style={styles.contentValue}>{content.prescribedBy || 'Not specified'}</Text>
      </View>
      {content.notes && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Notes:</Text>
          <Text style={styles.contentValue}>{content.notes}</Text>
        </View>
      )}
      {content.details && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Details:</Text>
          <Text style={styles.contentValue}>{content.details}</Text>
        </View>
      )}
    </View>
  );

  const renderLabContent = (content) => (
    <View style={styles.contentSection}>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Test Type:</Text>
        <Text style={styles.contentValue}>{content.testType || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Lab:</Text>
        <Text style={styles.contentValue}>{content.labName || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Ordered By:</Text>
        <Text style={styles.contentValue}>{content.orderedBy || 'Not specified'}</Text>
      </View>
      
      {content.details && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Details:</Text>
          <Text style={styles.contentValue}>{content.details}</Text>
        </View>
      )}
      
      <Text style={styles.resultsTitle}>Results:</Text>
      {content.results && content.results.length > 0 ? (
        content.results.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{result.marker}:</Text>
              <Text style={styles.resultValue}>{result.value} {result.unit}</Text>
            </View>
            <Text style={styles.resultRange}>Normal range: {result.range} {result.unit}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyResults}>No results available</Text>
      )}
    </View>
  );

  const renderInsuranceContent = (content) => (
    <View style={styles.contentSection}>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Provider:</Text>
        <Text style={styles.contentValue}>{content.provider || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Member ID:</Text>
        <Text style={styles.contentValue}>{content.memberID || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Group:</Text>
        <Text style={styles.contentValue}>{content.group || 'Not specified'}</Text>
      </View>
      <View style={styles.contentRow}>
        <Text style={styles.contentLabel}>Plan Type:</Text>
        <Text style={styles.contentValue}>{content.planType || 'Not specified'}</Text>
      </View>
      
      {content.effectiveDate && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Effective Date:</Text>
          <Text style={styles.contentValue}>{content.effectiveDate}</Text>
        </View>
      )}

      {content.details && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Details:</Text>
          <Text style={styles.contentValue}>{content.details}</Text>
        </View>
      )}
      
      {content.copay && (
        <>
          <Text style={styles.subsectionTitle}>Co-pays:</Text>
          <View style={styles.contentRow}>
            <Text style={styles.contentLabel}>Primary Care:</Text>
            <Text style={styles.contentValue}>{content.copay.primaryCare}</Text>
          </View>
          <View style={styles.contentRow}>
            <Text style={styles.contentLabel}>Specialist:</Text>
            <Text style={styles.contentValue}>{content.copay.specialist}</Text>
          </View>
          <View style={styles.contentRow}>
            <Text style={styles.contentLabel}>Emergency:</Text>
            <Text style={styles.contentValue}>{content.copay.emergency}</Text>
          </View>
        </>
      )}
    </View>
  );

  const renderNotesContent = (content) => (
    <View style={styles.contentSection}>
      {content.provider && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Provider:</Text>
          <Text style={styles.contentValue}>{content.provider}</Text>
        </View>
      )}
      
      {content.specialty && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Specialty:</Text>
          <Text style={styles.contentValue}>{content.specialty}</Text>
        </View>
      )}
      
      {content.visitDate && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Visit Date:</Text>
          <Text style={styles.contentValue}>{content.visitDate}</Text>
        </View>
      )}
      
      {content.reason && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Reason:</Text>
          <Text style={styles.contentValue}>{content.reason}</Text>
        </View>
      )}
      
      {content.details && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Details:</Text>
          <Text style={styles.contentValue}>{content.details}</Text>
        </View>
      )}
      
      {content.notes && (
        <>
          <Text style={styles.subsectionTitle}>Notes:</Text>
          <Text style={styles.notesText}>{content.notes}</Text>
        </>
      )}
      
      {content.recommendations && (
        <>
          <Text style={styles.subsectionTitle}>Recommendations:</Text>
          <Text style={styles.notesText}>{content.recommendations}</Text>
        </>
      )}
    </View>
  );

  const renderGenericContent = (content) => (
    <View style={styles.contentSection}>
      {content.details && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Details:</Text>
          <Text style={styles.contentValue}>{content.details}</Text>
        </View>
      )}
      
      {content.notes && (
        <View style={styles.contentRow}>
          <Text style={styles.contentLabel}>Notes:</Text>
          <Text style={styles.contentValue}>{content.notes}</Text>
        </View>
      )}
      
      {(!content.details && !content.notes) && (
        <Text style={styles.contentValue}>No content available for this document.</Text>
      )}
    </View>
  );

  const renderDocumentContent = () => {
    if (!document || !document.content || viewMode === 'original') return null;
    
    switch (document.type) {
      case 'prescription':
        return renderPrescriptionContent(document.content);
      case 'lab':
        return renderLabContent(document.content);
      case 'insurance':
        return renderInsuranceContent(document.content);
      case 'notes':
        return renderNotesContent(document.content);
      default:
        return renderGenericContent(document.content);
    }
  };

  const renderJargonSection = () => {
    if (!document || !document.jargon || document.jargon.length === 0 || viewMode === 'original') return null;
    
    return (
      <View style={styles.jargonContainer}>
        <TouchableOpacity 
          style={styles.jargonHeader} 
          onPress={() => setShowJargon(!showJargon)}
        >
          <Text style={styles.jargonTitle}>Medical Terms Explained</Text>
          <Ionicons 
            name={showJargon ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
        
        {showJargon && (
          <View style={styles.jargonContent}>
            {document.jargon.map((item, index) => (
              <View key={index} style={styles.jargonItem}>
                <Text style={styles.jargonTerm}>{item.term}</Text>
                <Text style={styles.jargonMeaning}>{item.meaning}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const handleShareDocument = async () => {
    if (!document) return;
    
    try {
      const message = `Check out this medical document: ${document.title}`;
      const url = document.image || '';
      
      const shareOptions = {
        message,
        title: document.title,
        subject: `Medical Document: ${document.title}`,
      };
      
      // Add the URL if it exists (will only work for public URLs)
      if (url && !url.startsWith('file://')) {
        shareOptions.url = url;
      }
      
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing document:', error);
      Alert.alert('Error', 'Failed to share document. Please try again.');
    }
  };

  const handleDownloadDocument = () => {
    if (!document || !document.image) {
      Alert.alert('Error', 'No document image available to download.');
      return;
    }
    
    try {
      if (Platform.OS === 'web') {
        // On web platforms, we can simply open the document in a new tab
        window.open(document.image, '_blank');
        
        // Show success message
        Alert.alert('Success', 'Document opened in a new tab.');
      } else {
        // For mobile, we'd need a file system library like react-native-fs
        // For now, just show an information dialog
        Alert.alert(
          'Download Information',
          'On iOS and Android, downloaded files are automatically saved to your device gallery or files app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document. Please try again.');
    }
  };

  const handlePrintDocument = () => {
    if (!document) {
      Alert.alert('Error', 'No document available to print.');
      return;
    }
    
    try {
      if (Platform.OS === 'web') {
        // On web, we can use the browser's print functionality
        if (document.image) {
          // For documents with images, we can open the image in a new tab and print
          const printWindow = window.open(document.image, '_blank');
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          // For documents without images, we'll print the current page
          window.print();
        }
      } else {
        // For mobile platforms, we'd need a specialized printing library
        Alert.alert(
          'Print Information',
          'Printing is available on web platform. On mobile, you can share the document to a printing app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error printing document:', error);
      Alert.alert('Error', 'Failed to print document. Please try again.');
    }
  };

  const handleDeleteDocument = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDocument(documentId);
              setLoading(false);
              
              // Show success message
              Alert.alert(
                'Success',
                'Document deleted successfully',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error deleting document:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to delete document. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Document Details" 
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightIcon="share-outline"
        onRightPress={handleShareDocument}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      ) : document ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.documentHeader}>
            <View style={styles.documentIconContainer}>
              <Ionicons name={getIconForType(document.type)} size={30} color={COLORS.primary} />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <Text style={styles.documentDate}>{document.date}</Text>
            </View>
          </View>
          
          {renderToggleViewButton()}
          {renderDocumentImage()}
          {renderDocumentContent()}
          {renderJargonSection()}
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleDownloadDocument}
            >
              <Ionicons name="download-outline" size={24} color={COLORS.primary} />
              <Text style={styles.actionText}>Download</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handlePrintDocument}
            >
              <Ionicons name="print-outline" size={24} color={COLORS.primary} />
              <Text style={styles.actionText}>Print</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleDeleteDocument}
            >
              <Ionicons name="trash-outline" size={24} color={COLORS.accent} />
              <Text style={[styles.actionText, { color: COLORS.accent }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={60} color="#CBD5E0" />
          <Text style={styles.errorText}>Document not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.base,
    color: COLORS.text,
    fontSize: SIZES.body,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.base * 2,
    paddingBottom: SIZES.base * 6,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 2,
    marginBottom: SIZES.base * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.base * 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: SIZES.small,
    color: '#718096',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base * 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewToggleButton: {
    flex: 1,
    padding: SIZES.base * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  viewToggleText: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  viewToggleTextActive: {
    color: 'white',
  },
  imageContainer: {
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    marginBottom: SIZES.base * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentImage: {
    width: '100%',
    height: 400,
    borderRadius: SIZES.radius - 4,
  },
  contentSection: {
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 2,
    marginBottom: SIZES.base * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentRow: {
    marginBottom: SIZES.base * 1.5,
  },
  contentLabel: {
    fontSize: SIZES.small,
    color: '#718096',
    marginBottom: 2,
  },
  contentValue: {
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  subsectionTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.base,
    marginBottom: SIZES.base,
  },
  resultsTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.base * 2,
    marginBottom: SIZES.base,
  },
  resultItem: {
    marginBottom: SIZES.base,
    paddingBottom: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: SIZES.body,
    color: COLORS.text,
    fontWeight: '500',
    marginRight: SIZES.base,
  },
  resultValue: {
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  resultRange: {
    fontSize: SIZES.small,
    color: '#718096',
    marginTop: 2,
  },
  emptyResults: {
    fontSize: SIZES.body,
    color: '#718096',
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: SIZES.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  jargonContainer: {
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  jargonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.base * 2,
    borderBottomWidth: showJargon => (showJargon ? 1 : 0),
    borderBottomColor: '#E2E8F0',
  },
  jargonTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  jargonContent: {
    padding: SIZES.base * 2,
  },
  jargonItem: {
    marginBottom: SIZES.base * 1.5,
  },
  jargonTerm: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  jargonMeaning: {
    fontSize: SIZES.small,
    color: '#718096',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 2,
    marginBottom: SIZES.base * 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: SIZES.small,
    color: COLORS.text,
    marginTop: SIZES.base / 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.base * 3,
  },
  errorText: {
    fontSize: SIZES.h2,
    color: '#718096',
    marginTop: SIZES.base * 2,
    marginBottom: SIZES.base * 3,
  },
  backButton: {
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.base * 3,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: SIZES.body,
  },
});

export default DocumentViewerScreen;
