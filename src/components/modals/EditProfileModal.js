import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../../styles/theme';

const EditProfileModal = ({ 
  visible, 
  onClose, 
  fieldToEdit, 
  fieldLabel, 
  initialValue, 
  onSave,
  isLoading 
}) => {
  const [value, setValue] = useState(initialValue || '');

  const handleSave = () => {
    onSave(value);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit {fieldLabel}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{fieldLabel}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder={`Enter your ${fieldLabel.toLowerCase()}`}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.base * 3,
    minHeight: 250,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base * 3,
  },
  modalTitle: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.base,
  },
  inputContainer: {
    marginBottom: SIZES.base * 3,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 2,
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    padding: SIZES.base * 1.5,
    borderRadius: SIZES.radius,
    marginLeft: SIZES.base,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  saveButtonText: {
    color: 'white',
    fontSize: SIZES.body,
    fontWeight: '500',
  },
});

export default EditProfileModal; 