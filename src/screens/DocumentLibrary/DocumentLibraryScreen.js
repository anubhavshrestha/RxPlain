import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  RefreshControl,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../styles/theme';
import Header from '../../components/layout/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getDocuments, filterDocumentsByType, searchDocuments } from '../../services/DocumentService';

// Add sort options
const SORT_OPTIONS = {
  DATE_NEWEST: 'date_newest',
  DATE_OLDEST: 'date_oldest',
  TITLE_A_Z: 'title_a_z',
  TITLE_Z_A: 'title_z_a',
  TYPE: 'type'
};

const DocumentLibraryScreen = ({ navigation }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState(SORT_OPTIONS.DATE_NEWEST);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Load documents on first render
  useEffect(() => {
    loadDocuments();
  }, []);

  // Load documents from service
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await getDocuments();
      
      // Sort the documents
      const sortedDocuments = sortDocuments(data, sortOption);
      setDocuments(sortedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sorting function
  const sortDocuments = (docs, sortBy) => {
    if (!docs || !docs.length) return [];
    
    const sortedDocs = [...docs];
    
    switch (sortBy) {
      case SORT_OPTIONS.DATE_NEWEST:
        return sortedDocs.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      case SORT_OPTIONS.DATE_OLDEST:
        return sortedDocs.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      case SORT_OPTIONS.TITLE_A_Z:
        return sortedDocs.sort((a, b) => a.title.localeCompare(b.title));
      
      case SORT_OPTIONS.TITLE_Z_A:
        return sortedDocs.sort((a, b) => b.title.localeCompare(a.title));
      
      case SORT_OPTIONS.TYPE:
        return sortedDocs.sort((a, b) => a.type.localeCompare(b.type));
      
      default:
        return sortedDocs;
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  // Filter documents by type
  const handleFilterChange = async (filter) => {
    setActiveFilter(filter);
    setLoading(true);
    try {
      const data = await filterDocumentsByType(filter);
      
      // Apply the current sort to the filtered results
      const sortedDocuments = sortDocuments(data, sortOption);
      setDocuments(sortedDocuments);
    } catch (error) {
      console.error('Error filtering documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle sort change
  const handleSortChange = (option) => {
    setSortOption(option);
    setShowSortMenu(false);
    
    // Re-sort the current document list
    const sortedDocuments = sortDocuments([...documents], option);
    setDocuments(sortedDocuments);
  };

  // Search documents
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setSearching(true);
      try {
        const results = await searchDocuments(text);
        
        // Apply the current sort to the search results
        const sortedResults = sortDocuments(results, sortOption);
        setDocuments(sortedResults);
      } catch (error) {
        console.error('Error searching documents:', error);
      } finally {
        setSearching(false);
      }
    } else {
      // If search is cleared, reload all documents or current filter
      handleFilterChange(activeFilter);
    }
  };

  // Render document item
  const renderDocumentItem = ({ item }) => {
    let iconName = 'document-text-outline';
    if (item.type === 'prescription') iconName = 'medkit-outline';
    if (item.type === 'lab') iconName = 'flask-outline';
    if (item.type === 'insurance') iconName = 'card-outline';
    if (item.type === 'notes') iconName = 'clipboard-outline';

    return (
      <TouchableOpacity 
        style={styles.documentItem}
        onPress={() => navigation.navigate('DocumentViewer', { documentId: item.id })}
      >
        <View style={styles.documentIconContainer}>
          <Ionicons name={iconName} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentName}>{item.title}</Text>
          <Text style={styles.documentDate}>{item.date}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
      </TouchableOpacity>
    );
  };

  // Render sort menu
  const renderSortMenu = () => {
    if (!showSortMenu) return null;
    
    return (
      <View style={styles.sortMenu}>
        <TouchableOpacity 
          style={[styles.sortOption, sortOption === SORT_OPTIONS.DATE_NEWEST && styles.activeSortOption]} 
          onPress={() => handleSortChange(SORT_OPTIONS.DATE_NEWEST)}
        >
          <Ionicons 
            name="calendar" 
            size={18} 
            color={sortOption === SORT_OPTIONS.DATE_NEWEST ? COLORS.primary : COLORS.text} 
          />
          <Text style={[styles.sortOptionText, sortOption === SORT_OPTIONS.DATE_NEWEST && styles.activeSortOptionText]}>
            Newest First
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortOption, sortOption === SORT_OPTIONS.DATE_OLDEST && styles.activeSortOption]} 
          onPress={() => handleSortChange(SORT_OPTIONS.DATE_OLDEST)}
        >
          <Ionicons 
            name="calendar-outline" 
            size={18} 
            color={sortOption === SORT_OPTIONS.DATE_OLDEST ? COLORS.primary : COLORS.text} 
          />
          <Text style={[styles.sortOptionText, sortOption === SORT_OPTIONS.DATE_OLDEST && styles.activeSortOptionText]}>
            Oldest First
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortOption, sortOption === SORT_OPTIONS.TITLE_A_Z && styles.activeSortOption]} 
          onPress={() => handleSortChange(SORT_OPTIONS.TITLE_A_Z)}
        >
          <Ionicons 
            name="text" 
            size={18} 
            color={sortOption === SORT_OPTIONS.TITLE_A_Z ? COLORS.primary : COLORS.text} 
          />
          <Text style={[styles.sortOptionText, sortOption === SORT_OPTIONS.TITLE_A_Z && styles.activeSortOptionText]}>
            Title (A-Z)
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortOption, sortOption === SORT_OPTIONS.TITLE_Z_A && styles.activeSortOption]} 
          onPress={() => handleSortChange(SORT_OPTIONS.TITLE_Z_A)}
        >
          <Ionicons 
            name="text-outline" 
            size={18} 
            color={sortOption === SORT_OPTIONS.TITLE_Z_A ? COLORS.primary : COLORS.text} 
          />
          <Text style={[styles.sortOptionText, sortOption === SORT_OPTIONS.TITLE_Z_A && styles.activeSortOptionText]}>
            Title (Z-A)
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortOption, sortOption === SORT_OPTIONS.TYPE && styles.activeSortOption]} 
          onPress={() => handleSortChange(SORT_OPTIONS.TYPE)}
        >
          <Ionicons 
            name="apps" 
            size={18} 
            color={sortOption === SORT_OPTIONS.TYPE ? COLORS.primary : COLORS.text} 
          />
          <Text style={[styles.sortOptionText, sortOption === SORT_OPTIONS.TYPE && styles.activeSortOptionText]}>
            By Type
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="My Documents" 
        leftIcon="menu-outline"
        rightIcon={searching ? null : "search-outline"}
        onRightPress={() => setSearching(!searching)}
      />
      
      {searching && (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#A0AEC0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            clearButtonMode="while-editing"
          />
          <TouchableOpacity onPress={() => setSearching(false)}>
            <Ionicons name="close-outline" size={20} color="#A0AEC0" />
          </TouchableOpacity>
        </View>
      )}
      
      {renderSortMenu()}
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
            onPress={() => handleFilterChange('all')}
          >
            <Text style={activeFilter === 'all' ? styles.activeFilterText : styles.filterText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'prescription' && styles.activeFilter]}
            onPress={() => handleFilterChange('prescription')}
          >
            <Text style={activeFilter === 'prescription' ? styles.activeFilterText : styles.filterText}>Prescriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'lab' && styles.activeFilter]}
            onPress={() => handleFilterChange('lab')}
          >
            <Text style={activeFilter === 'lab' ? styles.activeFilterText : styles.filterText}>Lab Results</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'insurance' && styles.activeFilter]}
            onPress={() => handleFilterChange('insurance')}
          >
            <Text style={activeFilter === 'insurance' ? styles.activeFilterText : styles.filterText}>Insurance</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'notes' && styles.activeFilter]}
            onPress={() => handleFilterChange('notes')}
          >
            <Text style={activeFilter === 'notes' ? styles.activeFilterText : styles.filterText}>Notes</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : documents.length > 0 ? (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderDocumentItem}
          contentContainerStyle={styles.documentsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color="#CBD5E0" />
          <Text style={styles.emptyText}>No documents found</Text>
          {activeFilter !== 'all' ? (
            <Text style={styles.emptySubtext}>
              Try changing the filter or add a new document
            </Text>
          ) : (
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first document
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('Capture')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.base * 2,
    paddingVertical: SIZES.base,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: SIZES.base,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: SIZES.body,
  },
  filterContainer: {
    paddingVertical: SIZES.base,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: SIZES.base * 2,
  },
  filterButton: {
    paddingHorizontal: SIZES.base * 2,
    paddingVertical: SIZES.base,
    marginRight: SIZES.base,
    borderRadius: 20,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.text,
    fontSize: SIZES.small,
  },
  activeFilterText: {
    color: 'white',
    fontSize: SIZES.small,
    fontWeight: '500',
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
  documentsList: {
    padding: SIZES.base * 2,
  },
  documentItem: {
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.base * 4,
  },
  emptyText: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.base * 2,
  },
  emptySubtext: {
    fontSize: SIZES.body,
    color: '#718096',
    textAlign: 'center',
    marginTop: SIZES.base,
  },
  addButton: {
    position: 'absolute',
    bottom: SIZES.base * 3,
    right: SIZES.base * 3,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  sortMenu: {
    backgroundColor: 'white',
    margin: SIZES.base * 2,
    marginTop: 0,
    borderRadius: SIZES.radius,
    padding: SIZES.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.base * 2,
  },
  activeSortOption: {
    backgroundColor: '#E6F7FF',
    borderRadius: SIZES.radius,
  },
  sortOptionText: {
    fontSize: SIZES.body,
    color: COLORS.text,
    marginLeft: SIZES.base,
  },
  activeSortOptionText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default DocumentLibraryScreen;
