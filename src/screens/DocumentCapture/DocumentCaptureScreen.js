import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Header from '../../components/layout/Header';
import Button from '../../components/buttons/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { saveDocument } from '../../services/DocumentService';

// Only import native modules on native platforms
let Camera, useCameraDevice, DocumentPicker, launchImageLibrary;

if (Platform.OS !== 'web') {
  try {
    const VisionCamera = require('react-native-vision-camera');
    Camera = VisionCamera.Camera;
    useCameraDevice = VisionCamera.useCameraDevice;
    
    DocumentPicker = require('react-native-document-picker').default;
    
    const ImagePicker = require('react-native-image-picker');
    launchImageLibrary = ImagePicker.launchImageLibrary;
  } catch (error) {
    console.error('Error importing native modules:', error);
  }
}

const DocumentCaptureScreen = ({ navigation }) => {
  const [captureMode, setCaptureMode] = useState('camera'); // 'camera' or 'manual'
  const [cameraActive, setCameraActive] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentType, setDocumentType] = useState('prescription');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentDetails, setDocumentDetails] = useState('');
  const [documentNotes, setDocumentNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [pickedDocument, setPickedDocument] = useState(null);
  
  const camera = useRef(null);
  const device = Platform.OS !== 'web' && useCameraDevice ? useCameraDevice('back') : null;
  const fileInputRef = useRef(null);
  
  // Request camera permissions on native platforms
  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'web') {
        // Web doesn't need the same permissions
        return;
      }
      
      try {
        if (Platform.OS === 'android' && PermissionsAndroid) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: "Camera Permission",
              message: "RxPlain needs access to your camera to scan documents",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else if (Platform.OS === 'ios' && Camera) {
          const status = await Camera.requestCameraPermission();
          setHasPermission(status === 'authorized');
        }
      } catch (err) {
        console.error('Failed to request camera permission:', err);
      }
    };

    requestCameraPermission();
  }, []);
  
  const handleCapture = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Camera capture is not available on web. Please use the mobile app.');
      return;
    }
    
    if (camera.current && hasPermission) {
      try {
        const photo = await camera.current.takePhoto({
          flash: 'off',
          quality: 90
        });
        
        setCapturedImage({
          uri: `file://${photo.path}`,
          type: 'image/jpeg'
        });
        
        setCameraActive(false);
        setCaptureMode('manual');
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const handlePickDocument = async () => {
    if (Platform.OS === 'web') {
      // For web, we use the file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
      });
      
      setPickedDocument(result[0]);
      setCaptureMode('manual');
    } catch (err) {
      if (DocumentPicker && !DocumentPicker.isCancel(err)) {
        console.error('Error picking document:', err);
        Alert.alert('Error', 'Failed to pick document. Please try again.');
      }
    }
  };

  const handleWebFilePicked = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Create a URL for the selected file
      const fileUrl = URL.createObjectURL(file);
      
      // Set the picked document based on the file type
      if (file.type.startsWith('image/')) {
        setCapturedImage({
          uri: fileUrl,
          type: file.type,
          name: file.name
        });
      } else {
        setPickedDocument({
          uri: fileUrl,
          type: file.type,
          name: file.name,
          size: file.size
        });
      }
      
      // Suggest a title based on the filename (without extension)
      const suggestedTitle = file.name.replace(/\.[^/.]+$/, "");
      setDocumentTitle(suggestedTitle);
      
      setCaptureMode('manual');
    }
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      // For web, we use the file input but limit to images
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'image/*';
        fileInputRef.current.click();
      }
      return;
    }
    
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        setCapturedImage(result.assets[0]);
        setCaptureMode('manual');
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const handleSaveDocument = async () => {
    if (!documentTitle.trim()) {
      Alert.alert('Error', 'Please enter a document title');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create a document object with the captured data
      const newDocument = {
        title: documentTitle,
        type: documentType,
        date: documentDate,
        image: (capturedImage && capturedImage.uri) || (pickedDocument && pickedDocument.uri) || null,
        content: {
          details: documentDetails,
          notes: documentNotes
        }
      };
      
      // For different document types, add specific fields
      if (documentType === 'prescription') {
        // Parse medication info from details or use defaults
        newDocument.content = {
          ...newDocument.content,
          medication: documentDetails.split('\n')[0] || 'Not specified',
          dosage: 'Not specified',
          frequency: 'Not specified',
          duration: 'Not specified',
          prescribedBy: 'Not specified',
          notes: documentNotes
        };
      } else if (documentType === 'lab') {
        newDocument.content = {
          ...newDocument.content,
          testType: documentDetails.split('\n')[0] || 'Not specified',
          results: [],
          labName: 'Not specified',
          orderedBy: 'Not specified'
        };
      } else if (documentType === 'insurance') {
        newDocument.content = {
          ...newDocument.content,
          provider: documentDetails.split('\n')[0] || 'Not specified',
          memberID: 'Not specified',
          group: 'Not specified',
          planType: 'Not specified'
        };
      }
      
      // Save the document
      const savedDocument = await saveDocument(newDocument);
      
      // Success message
      Alert.alert(
        'Success',
        'Document saved successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const renderCameraCapture = () => {
    // On web platform, show a modified version with file picker
    if (Platform.OS === 'web') {
      return (
        <View style={styles.captureContainer}>
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="desktop-outline" size={80} color="#CBD5E0" />
            <Text style={styles.placeholderText}>
              Camera capture is only available in the mobile app.
            </Text>
            <Text style={styles.placeholderSubtext}>
              You can still upload documents on the web.
            </Text>
            
            {/* Hidden file input for web */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,application/pdf"
              onChange={handleWebFilePicked}
            />
            
            <View style={styles.buttonGroup}>
              <Button 
                title="Upload Document or Image" 
                onPress={handlePickDocument}
                style={styles.actionButton}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setCaptureMode('manual')}
            >
              <Text style={styles.switchText}>Enter details manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    if (cameraActive && device && hasPermission && Camera) {
      return (
        <View style={styles.captureContainer}>
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={true}
            photo={true}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame} />
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setCameraActive(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={handleCapture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.flashButton}>
              <Ionicons name="flash-off" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.captureContainer}>
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="camera" size={80} color="#CBD5E0" />
          {!hasPermission && Platform.OS !== 'web' ? (
            <Text style={styles.placeholderText}>Camera permission is required for this feature</Text>
          ) : (
            <Text style={styles.placeholderText}>Choose how you want to add a document</Text>
          )}
          
          <View style={styles.buttonGroup}>
            {hasPermission && Platform.OS !== 'web' && (
              <Button 
                title="Use Camera" 
                onPress={() => setCameraActive(true)}
                style={styles.actionButton}
              />
            )}
            
            {Platform.OS !== 'web' && (
              <>
                <Button 
                  title="Pick Document" 
                  onPress={handlePickDocument}
                  style={styles.actionButton}
                />
                
                <Button 
                  title="Choose Image" 
                  onPress={handlePickImage}
                  style={styles.actionButton}
                />
              </>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => setCaptureMode('manual')}
          >
            <Text style={styles.switchText}>Enter details manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderManualEntry = () => (
    <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
      {/* Display captured or picked image/document */}
      {(capturedImage || pickedDocument) && (
        <View style={styles.previewContainer}>
          {capturedImage && (
            <Image 
              source={{ uri: capturedImage.uri }} 
              style={styles.previewImage} 
              resizeMode="contain" 
            />
          )}
          {pickedDocument && !capturedImage && (
            <View style={styles.documentPreview}>
              <Ionicons 
                name={pickedDocument.type?.includes('pdf') ? "document-text" : "image"} 
                size={50} 
                color={COLORS.primary} 
              />
              <Text style={styles.documentName}>
                {pickedDocument.name || 'Document'}
              </Text>
            </View>
          )}
          
          {/* Option to change the document */}
          <TouchableOpacity 
            style={styles.changeDocumentButton}
            onPress={Platform.OS === 'web' ? handlePickDocument : handlePickImage}
          >
            <Text style={styles.changeDocumentText}>Change document</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Form fields for document details */}
      <Text style={styles.formLabel}>Document Title*</Text>
      <TextInput
        style={styles.formInput}
        placeholder="Enter document title"
        value={documentTitle}
        onChangeText={setDocumentTitle}
      />
      
      <Text style={styles.formLabel}>Document Date</Text>
      <TextInput
        style={styles.formInput}
        placeholder="YYYY-MM-DD"
        value={documentDate}
        onChangeText={setDocumentDate}
      />
      
      <Text style={styles.formLabel}>Document Type</Text>
      <View style={styles.typeButtonsContainer}>
        <TouchableOpacity 
          style={[styles.typeButton, documentType === 'prescription' && styles.activeTypeButton]}
          onPress={() => setDocumentType('prescription')}
        >
          <Ionicons 
            name="medkit-outline" 
            size={24} 
            color={documentType === 'prescription' ? 'white' : COLORS.text} 
          />
          <Text style={[styles.typeText, documentType === 'prescription' && styles.activeTypeText]}>
            Prescription
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.typeButton, documentType === 'lab' && styles.activeTypeButton]}
          onPress={() => setDocumentType('lab')}
        >
          <Ionicons 
            name="flask-outline" 
            size={24} 
            color={documentType === 'lab' ? 'white' : COLORS.text} 
          />
          <Text style={[styles.typeText, documentType === 'lab' && styles.activeTypeText]}>
            Lab Results
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.typeButton, documentType === 'insurance' && styles.activeTypeButton]}
          onPress={() => setDocumentType('insurance')}
        >
          <Ionicons 
            name="card-outline" 
            size={24} 
            color={documentType === 'insurance' ? 'white' : COLORS.text} 
          />
          <Text style={[styles.typeText, documentType === 'insurance' && styles.activeTypeText]}>
            Insurance
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.typeButton, documentType === 'notes' && styles.activeTypeButton]}
          onPress={() => setDocumentType('notes')}
        >
          <Ionicons 
            name="clipboard-outline" 
            size={24} 
            color={documentType === 'notes' ? 'white' : COLORS.text} 
          />
          <Text style={[styles.typeText, documentType === 'notes' && styles.activeTypeText]}>
            Notes
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.formLabel}>Document Details</Text>
      <TextInput
        style={[styles.formInput, styles.textArea]}
        placeholder={getPlaceholderForType(documentType)}
        multiline
        numberOfLines={5}
        value={documentDetails}
        onChangeText={setDocumentDetails}
      />
      
      <Text style={styles.formLabel}>Notes</Text>
      <TextInput
        style={[styles.formInput, styles.textArea]}
        placeholder="Enter any additional notes or information"
        multiline
        numberOfLines={3}
        value={documentNotes}
        onChangeText={setDocumentNotes}
      />
      
      <Button 
        title="Save Document" 
        onPress={handleSaveDocument}
        loading={isUploading}
        style={styles.saveButton}
      />
      
      {!capturedImage && !pickedDocument && (
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setCaptureMode('camera')}
        >
          <Text style={styles.switchText}>Use camera or pick a file instead</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const getPlaceholderForType = (type) => {
    switch(type) {
      case 'prescription':
        return "Enter medication name, dosage, instructions, etc.";
      case 'lab':
        return "Enter test name, results, reference ranges, etc.";
      case 'insurance':
        return "Enter insurance provider, policy number, coverage details, etc.";
      case 'notes':
        return "Enter doctor's notes, recommendations, follow-up details, etc.";
      default:
        return "Enter document details";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Add Document" 
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
      />
      
      {captureMode === 'camera' ? renderCameraCapture() : renderManualEntry()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  captureContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraView: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: '80%',
    height: '60%',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    padding: SIZES.base * 4,
  },
  placeholderText: {
    fontSize: SIZES.body,
    color: '#718096',
    textAlign: 'center',
    marginTop: SIZES.base * 2,
    marginBottom: SIZES.base,
  },
  placeholderSubtext: {
    fontSize: SIZES.small,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: SIZES.base * 4,
  },
  buttonGroup: {
    width: '100%',
    marginBottom: SIZES.base * 2,
  },
  actionButton: {
    marginBottom: SIZES.base,
  },
  switchButton: {
    marginTop: SIZES.base * 3,
    padding: SIZES.base,
  },
  switchText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: SIZES.base * 3,
    paddingBottom: SIZES.base * 6,
  },
  previewContainer: {
    marginBottom: SIZES.base * 3,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.radius,
    backgroundColor: '#F2F2F2',
  },
  documentPreview: {
    width: '100%',
    height: 150,
    borderRadius: SIZES.radius,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.base * 2,
  },
  documentName: {
    marginTop: SIZES.base,
    fontSize: SIZES.small,
    color: COLORS.text,
    textAlign: 'center',
  },
  changeDocumentButton: {
    marginTop: SIZES.base,
    padding: SIZES.base,
  },
  changeDocumentText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    fontWeight: '500',
  },
  formLabel: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  formInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 1.5,
    fontSize: SIZES.body,
    color: COLORS.text,
    marginBottom: SIZES.base * 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.base * 2,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: SIZES.base,
    borderRadius: SIZES.radius,
    marginRight: SIZES.base,
    marginBottom: SIZES.base,
    width: '48%',
  },
  activeTypeButton: {
    backgroundColor: COLORS.primary,
  },
  typeText: {
    fontSize: SIZES.small,
    color: COLORS.text,
    marginLeft: SIZES.base,
  },
  activeTypeText: {
    color: 'white',
  },
  saveButton: {
    marginTop: SIZES.base * 2,
  },
});

export default DocumentCaptureScreen;