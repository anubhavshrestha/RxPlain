import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Header from '../../components/layout/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getUserProfile, updateUserProfile, changePassword } from '../../services/UserService';
import { useAuth } from '../../App';
import { launchImageLibrary } from 'react-native-image-picker';
import EditProfileModal from '../../components/modals/EditProfileModal';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editField, setEditField] = useState({ field: '', label: '', value: '' });
  const [savingField, setSavingField] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { setIsAuthenticated } = useAuth();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Could not load profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 500,
        maxWidth: 500,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        updateProfileImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const updateProfileImage = async (imageUri) => {
    try {
      setLoading(true);
      await updateUserProfile({
        ...profile,
        profileImage: imageUri
      });
      
      // Reload user profile to get updated data
      await loadUserProfile();
      
      Alert.alert('Success', 'Profile image updated successfully!');
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (field, label, value) => {
    setEditField({ field, label, value });
    setModalVisible(true);
  };

  const handleSaveField = async (newValue) => {
    if (newValue === editField.value) {
      setModalVisible(false);
      return;
    }

    setSavingField(true);
    try {
      const updatedProfile = { ...profile };
      
      // Handle nested fields like medicalInfo.bloodType
      if (editField.field.includes('.')) {
        const [parentField, childField] = editField.field.split('.');
        updatedProfile[parentField] = {
          ...updatedProfile[parentField],
          [childField]: newValue
        };
      } else {
        updatedProfile[editField.field] = newValue;
      }
      
      await updateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      setModalVisible(false);
      Alert.alert('Success', `${editField.label} updated successfully!`);
    } catch (error) {
      console.error(`Error updating ${editField.field}:`, error);
      Alert.alert('Error', `Failed to update ${editField.label}. Please try again.`);
    } finally {
      setSavingField(false);
    }
  };

  const handleToggleNotification = async (type, value) => {
    if (!profile) return;
    
    try {
      const updatedPreferences = {
        notifications: {
          ...profile.preferences.notifications,
          [type]: value
        }
      };
      
      await updateUserProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          ...updatedPreferences
        }
      });
      
      // Update local state
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          ...updatedPreferences
        }
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update preferences. Please try again.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            // In a real app, we would clear the auth token from secure storage
            setIsAuthenticated(false);
          } 
        }
      ]
    );
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    setChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      
      if (result.success) {
        setPasswordModalVisible(false);
        Alert.alert('Success', 'Password changed successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to change password. Please try again.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <TouchableOpacity style={styles.profileImageContainer} onPress={handlePickImage}>
        {profile?.profileImage ? (
          <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileInitials}>
              {profile?.name ? profile.name.split(' ').map(n => n[0]).join('') : 'U'}
            </Text>
          </View>
        )}
        <View style={styles.editImageButton}>
          <Ionicons name="camera" size={16} color="white" />
        </View>
      </TouchableOpacity>
      <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
      <Text style={styles.profileEmail}>{profile?.email || 'user@example.com'}</Text>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      
      <TouchableOpacity 
        style={styles.infoItem}
        // Name is not editable in this version
        activeOpacity={0.7}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>{profile?.name || 'Not set'}</Text>
        </View>
        <Ionicons name="lock" size={18} color="#CBD5E0" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.infoItem}
        // Email is not editable in this version
        activeOpacity={0.7}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile?.email || 'Not set'}</Text>
        </View>
        <Ionicons name="lock" size={18} color="#CBD5E0" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.infoItem}
        onPress={() => handleEditField('phone', 'Phone Number', profile?.phone || '')}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="call-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile?.phone || 'Not set'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.infoItem}
        // Birth date is not editable in this version
        activeOpacity={0.7}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <Text style={styles.infoValue}>{profile?.birthDate || 'Not set'}</Text>
        </View>
        <Ionicons name="lock" size={18} color="#CBD5E0" />
      </TouchableOpacity>
    </View>
  );

  const renderMedicalInfo = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Medical Information</Text>
      
      <TouchableOpacity 
        style={styles.infoItem}
        onPress={() => handleEditField(
          'medicalInfo.allergies', 
          'Allergies', 
          profile?.medicalInfo?.allergies?.join(', ') || ''
        )}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="warning-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Allergies</Text>
          <Text style={styles.infoValue}>
            {profile?.medicalInfo?.allergies?.join(', ') || 'None'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.infoItem}
        onPress={() => handleEditField(
          'medicalInfo.conditions', 
          'Medical Conditions', 
          profile?.medicalInfo?.conditions?.join(', ') || ''
        )}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="fitness-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Conditions</Text>
          <Text style={styles.infoValue}>
            {profile?.medicalInfo?.conditions?.join(', ') || 'None'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.infoItem}
        onPress={() => handleEditField(
          'medicalInfo.bloodType', 
          'Blood Type', 
          profile?.medicalInfo?.bloodType || ''
        )}
      >
        <View style={styles.infoIconContainer}>
          <Ionicons name="water-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Blood Type</Text>
          <Text style={styles.infoValue}>{profile?.medicalInfo?.bloodType || 'Not set'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
      </TouchableOpacity>
    </View>
  );

  const renderNotificationSettings = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Notification Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>Medication Reminders</Text>
          <Text style={styles.settingDescription}>Get notified when it's time to take your medication</Text>
        </View>
        <Switch
          value={profile?.preferences?.notifications?.medicationReminders ?? true}
          onValueChange={(value) => handleToggleNotification('medicationReminders', value)}
          trackColor={{ false: '#CBD5E0', true: COLORS.secondary }}
          thumbColor="white"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>Appointment Reminders</Text>
          <Text style={styles.settingDescription}>Get notified about upcoming appointments</Text>
        </View>
        <Switch
          value={profile?.preferences?.notifications?.appointmentReminders ?? true}
          onValueChange={(value) => handleToggleNotification('appointmentReminders', value)}
          trackColor={{ false: '#CBD5E0', true: COLORS.secondary }}
          thumbColor="white"
        />
      </View>
      
      <View style={styles.settingItem}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>Refill Reminders</Text>
          <Text style={styles.settingDescription}>Get notified when it's time to refill your prescriptions</Text>
        </View>
        <Switch
          value={profile?.preferences?.notifications?.refillReminders ?? true}
          onValueChange={(value) => handleToggleNotification('refillReminders', value)}
          trackColor={{ false: '#CBD5E0', true: COLORS.secondary }}
          thumbColor="white"
        />
      </View>
    </View>
  );

  const renderAccountOptions = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Account</Text>
      
      <TouchableOpacity 
        style={styles.accountOption}
        onPress={() => setPasswordModalVisible(true)}
      >
        <View style={styles.accountOptionIconContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.accountOptionText}>Change Password</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.accountOption}>
        <View style={styles.accountOptionIconContainer}>
          <Ionicons name="shield-outline" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.accountOptionText}>Privacy Settings</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.accountOption}>
        <View style={styles.accountOptionIconContainer}>
          <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.accountOptionText}>Help & Support</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.accountOption}
        onPress={handleLogout}
      >
        <View style={styles.accountOptionIconContainer}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.accent} />
        </View>
        <Text style={[styles.accountOptionText, { color: COLORS.accent }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" rightIcon="cog-outline" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {renderProfileHeader()}
          {renderPersonalInfo()}
          {renderMedicalInfo()}
          {renderNotificationSettings()}
          {renderAccountOptions()}
          
          <Text style={styles.versionText}>RxPlain v1.0.0</Text>
        </ScrollView>
      )}

      <EditProfileModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        fieldToEdit={editField.field}
        fieldLabel={editField.label}
        initialValue={editField.value}
        onSave={handleSaveField}
        isLoading={savingField}
      />

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        onSave={handleChangePassword}
        isLoading={changingPassword}
      />
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
    paddingBottom: SIZES.base * 6,
  },
  profileHeader: {
    alignItems: 'center',
    padding: SIZES.base * 3,
    backgroundColor: 'white',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SIZES.base * 2,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 36,
    color: 'white',
    fontWeight: 'bold',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  profileEmail: {
    fontSize: SIZES.body,
    color: '#718096',
  },
  sectionContainer: {
    backgroundColor: 'white',
    marginTop: SIZES.base,
    paddingHorizontal: SIZES.base * 2,
    paddingVertical: SIZES.base * 2,
  },
  sectionTitle: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.base * 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.base * 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.base * 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.small,
    color: '#718096',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.base * 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: SIZES.base * 2,
  },
  settingLabel: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: SIZES.small,
    color: '#718096',
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.base * 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  accountOptionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.base * 2,
  },
  accountOptionText: {
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  versionText: {
    textAlign: 'center',
    marginTop: SIZES.base * 3,
    fontSize: SIZES.small,
    color: '#718096',
  },
});

export default ProfileScreen;