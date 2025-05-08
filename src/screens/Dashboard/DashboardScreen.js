import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Header from '../../components/layout/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getDocuments } from '../../services/DocumentService';
import { getTodaysMedications, updateMedicationSchedule } from '../../services/MedicationService';
import { getUserProfile } from '../../services/UserService';

const DashboardScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load user profile
      const userProfile = await getUserProfile();
      setUser(userProfile);
      
      // Load recent documents
      const documents = await getDocuments();
      // Sort by date descending and take the 3 most recent
      const sortedDocuments = documents.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      ).slice(0, 3);
      setRecentDocuments(sortedDocuments);
      
      // Load today's medications
      const todaysMeds = await getTodaysMedications();
      setMedications(todaysMeds);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicationCheck = async (id, isCompleted) => {
    try {
      // Update medication status in the backend
      await updateMedicationSchedule(id, { isCompleted });
      
      // Update local state
      setMedications(medications.map(med => 
        med.id === id ? { ...med, isCompleted } : med
      ));
    } catch (error) {
      console.error('Error updating medication:', error);
    }
  };

  const navigateToDocumentViewer = (documentId) => {
    // Navigation to DocumentViewer using the correct route name
    navigation.navigate('DocumentViewer', { documentId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Dashboard" rightIcon="notifications-outline" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Dashboard" rightIcon="notifications-outline" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.nameText}>{user?.name || 'User'}</Text>
        </View>

        {/* Actions section */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Capture')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="camera" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Scan Document</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Documents')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="document-text" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>My Documents</Text>
          </TouchableOpacity>
        </View>

        {/* Recent documents section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Documents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Documents')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentDocuments.length > 0 ? (
            recentDocuments.map((doc) => (
              <TouchableOpacity 
                key={doc.id} 
                style={styles.documentItem}
                onPress={() => navigateToDocumentViewer(doc.id)}
              >
                <View style={styles.documentIconContainer}>
                  <Ionicons 
                    name={
                      doc.type === 'prescription' ? 'medkit-outline' :
                      doc.type === 'lab' ? 'flask-outline' :
                      doc.type === 'insurance' ? 'card-outline' :
                      doc.type === 'notes' ? 'clipboard-outline' :
                      'document-text-outline'
                    } 
                    size={24} 
                    color={COLORS.primary} 
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{doc.title}</Text>
                  <Text style={styles.documentDate}>{doc.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent documents</Text>
            </View>
          )}
        </View>

        {/* Medications section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Medications</Text>
          </View>

          {medications.length > 0 ? (
            medications.map((med) => (
              <View key={med.id} style={styles.medicationItem}>
                <View style={styles.medicationIconContainer}>
                  <Ionicons name="pill-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{med.name}</Text>
                  <Text style={styles.medicationDetails}>{med.dosage} - {med.time}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.checkButton}
                  onPress={() => handleMedicationCheck(med.id, !med.isCompleted)}
                >
                  <Ionicons 
                    name={med.isCompleted ? "checkmark-circle" : "checkmark-circle-outline"} 
                    size={28} 
                    color={med.isCompleted ? COLORS.success : "#A0AEC0"} 
                  />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No medications scheduled for today</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  },
  welcomeSection: {
    marginBottom: SIZES.base * 3,
  },
  welcomeText: {
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  nameText: {
    fontSize: SIZES.h1,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.base * 3,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: SIZES.base * 2,
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  actionText: {
    fontSize: SIZES.small,
    fontWeight: '500',
    color: COLORS.text,
  },
  sectionContainer: {
    marginBottom: SIZES.base * 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base * 2,
  },
  sectionTitle: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 2,
    marginBottom: SIZES.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.base * 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: SIZES.small,
    color: '#A0AEC0',
  },
  emptyState: {
    padding: SIZES.base * 3,
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: SIZES.body,
    color: '#A0AEC0',
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 2,
    marginBottom: SIZES.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F2F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.base * 2,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  medicationDetails: {
    fontSize: SIZES.small,
    color: '#A0AEC0',
  },
  checkButton: {
    padding: SIZES.base,
  },
});

export default DashboardScreen;
