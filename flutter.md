# Flutter Farm Management App - MAP & GPS Focus

## Overview

This document outlines the rebuilding of the Farm Management system as a Flutter application, specifically focused on **MAP & GPS functionality** and **Tree Management**. The app will be streamlined to match the core functionality of the existing iOS app while leveraging Flutter's cross-platform capabilities.

## Core Focus Areas

### 🗺️ MAP & GPS Integration
- Interactive map with tree locations
- Real-time GPS tracking and positioning
- Zone boundary visualization
- Offline map capability for field work
- GPS accuracy indicators
- Location-based tree operations

### 🌳 Tree Management  
- Tree registration with GPS coordinates
- Tree health status tracking
- Growth monitoring and fruit counting
- Photo capture with GPS metadata
- Tree search and filtering by location

## Technical Architecture

### Flutter Framework
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Map & GPS Core
  flutter_map: ^6.0.1           # Interactive maps with OpenStreetMap
  latlong2: ^0.8.1              # GPS coordinate handling
  geolocator: ^10.1.0           # GPS location services
  permission_handler: ^11.0.1    # Location permissions
  
  # Firebase Integration
  firebase_core: ^2.24.2
  cloud_firestore: ^4.13.6
  firebase_auth: ^4.15.3
  firebase_storage: ^11.5.6
  
  # Camera & Media
  camera: ^0.10.5+5
  image_picker: ^1.0.4
  
  # Offline Support
  sqflite: ^2.3.0              # Local database
  cached_network_image: ^3.3.0  # Image caching
  
  # UI Components
  flutter_bloc: ^8.1.3         # State management
  get_it: ^7.6.4               # Dependency injection
```

## App Structure

```
lib/
├── core/
│   ├── constants/
│   │   ├── app_constants.dart
│   │   └── map_constants.dart
│   ├── services/
│   │   ├── gps_service.dart
│   │   ├── map_service.dart
│   │   └── firebase_service.dart
│   └── utils/
│       ├── gps_utils.dart
│       └── coordinate_utils.dart
├── features/
│   ├── map/
│   │   ├── presentation/
│   │   │   ├── pages/
│   │   │   │   └── map_page.dart
│   │   │   ├── widgets/
│   │   │   │   ├── interactive_map.dart
│   │   │   │   ├── tree_marker.dart
│   │   │   │   ├── zone_boundary.dart
│   │   │   │   └── gps_indicator.dart
│   │   │   └── bloc/
│   │   │       └── map_bloc.dart
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── map_entities.dart
│   │   └── data/
│   │       └── repositories/
│   │           └── map_repository.dart
│   ├── trees/
│   │   ├── presentation/
│   │   │   ├── pages/
│   │   │   │   ├── tree_list_page.dart
│   │   │   │   ├── tree_detail_page.dart
│   │   │   │   └── add_tree_page.dart
│   │   │   ├── widgets/
│   │   │   │   ├── tree_card.dart
│   │   │   │   ├── gps_capture_widget.dart
│   │   │   │   └── photo_capture_widget.dart
│   │   │   └── bloc/
│   │   │       └── tree_bloc.dart
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── tree.dart
│   │   └── data/
│   │       └── repositories/
│   │           └── tree_repository.dart
│   └── gps/
│       ├── presentation/
│       │   └── widgets/
│       │       ├── gps_status_widget.dart
│       │       └── location_accuracy_widget.dart
│       ├── domain/
│       │   └── entities/
│       │       └── gps_location.dart
│       └── data/
│           └── services/
│               └── location_service.dart
└── main.dart
```

## Key Features Specification

### 1. Interactive Map System

#### Map Component Features
```dart
class InteractiveMap extends StatefulWidget {
  final List<Tree> trees;
  final List<Zone> zones;
  final Function(LatLng) onMapTap;
  final Function(Tree) onTreeTap;
  
  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      options: MapOptions(
        center: LatLng(10.8231, 106.6297), // Vietnam coordinates
        zoom: 15.0,
        minZoom: 10.0,
        maxZoom: 20.0,
        onTap: (tapPosition, point) => onMapTap(point),
      ),
      children: [
        // OpenStreetMap tile layer
        TileLayer(
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c'],
        ),
        
        // Zone boundaries
        PolygonLayer(
          polygons: zones.map((zone) => 
            Polygon(
              points: zone.boundary,
              color: zone.color.withOpacity(0.3),
              borderColor: zone.color,
              borderStrokeWidth: 2.0,
            )
          ).toList(),
        ),
        
        // Tree markers
        MarkerLayer(
          markers: trees.map((tree) =>
            Marker(
              point: LatLng(tree.latitude, tree.longitude),
              builder: (ctx) => TreeMarker(
                tree: tree,
                onTap: () => onTreeTap(tree),
              ),
            )
          ).toList(),
        ),
        
        // Current location marker
        MarkerLayer(
          markers: [
            if (currentLocation != null)
              Marker(
                point: currentLocation!,
                builder: (ctx) => GPSLocationMarker(),
              ),
          ],
        ),
      ],
    );
  }
}
```

#### Tree Marker Design
```dart
class TreeMarker extends StatelessWidget {
  final Tree tree;
  final VoidCallback onTap;
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _getHealthColor(tree.healthStatus),
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.white,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          Icons.park,
          color: Colors.white,
          size: 24,
        ),
      ),
    );
  }
  
  Color _getHealthColor(String healthStatus) {
    switch (healthStatus) {
      case 'Good': return Colors.green;
      case 'Fair': return Colors.orange;
      case 'Poor': return Colors.red;
      default: return Colors.grey;
    }
  }
}
```

### 2. GPS Service Implementation

```dart
class GPSService {
  final Geolocator _geolocator = Geolocator();
  
  // High accuracy location for tree registration
  Future<Position> getCurrentLocation({bool highAccuracy = true}) async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw LocationServiceDisabledException();
    }
    
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw LocationPermissionDeniedException();
      }
    }
    
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: highAccuracy 
        ? LocationAccuracy.bestForNavigation 
        : LocationAccuracy.high,
      timeLimit: Duration(seconds: 10),
    );
  }
  
  // Stream for real-time location updates
  Stream<Position> getLocationStream() {
    return Geolocator.getPositionStream(
      locationSettings: LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 1, // Update every 1 meter
        timeLimit: Duration(seconds: 5),
      ),
    );
  }
  
  // Calculate distance between two points
  double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }
  
  // GPS accuracy indicator
  String getAccuracyStatus(double accuracy) {
    if (accuracy <= 3) return 'Excellent';
    if (accuracy <= 5) return 'Good';
    if (accuracy <= 10) return 'Fair';
    return 'Poor';
  }
}
```

### 3. Tree Management Features

#### Tree Entity
```dart
class Tree {
  final String id;
  final String farmId;
  final String name;
  final String variety;
  final String qrCode;
  final double latitude;
  final double longitude;
  final double gpsAccuracy;
  final String healthStatus;
  final int manualFruitCount;
  final int aiFruitCount;
  final DateTime plantingDate;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String zoneId;
  final List<String> photoUrls;
  final bool needsAttention;
  
  // Constructor and methods
  Tree({
    required this.id,
    required this.farmId,
    required this.name,
    required this.variety,
    required this.qrCode,
    required this.latitude,
    required this.longitude,
    required this.gpsAccuracy,
    required this.healthStatus,
    this.manualFruitCount = 0,
    this.aiFruitCount = 0,
    required this.plantingDate,
    required this.createdAt,
    required this.updatedAt,
    required this.zoneId,
    this.photoUrls = const [],
    this.needsAttention = false,
  });
  
  // Distance from current location
  double distanceFromLocation(double currentLat, double currentLng) {
    return Geolocator.distanceBetween(
      currentLat, currentLng, latitude, longitude
    );
  }
  
  // Is tree within GPS accuracy range
  bool isLocationAccurate() => gpsAccuracy <= 5.0;
  
  // Convert to Firebase document
  Map<String, dynamic> toFirestore() {
    return {
      'farmId': farmId,
      'name': name,
      'variety': variety,
      'qrCode': qrCode,
      'latitude': latitude,
      'longitude': longitude,
      'gpsAccuracy': gpsAccuracy,
      'healthStatus': healthStatus,
      'manualFruitCount': manualFruitCount,
      'aiFruitCount': aiFruitCount,
      'plantingDate': Timestamp.fromDate(plantingDate),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'zoneId': zoneId,
      'photoUrls': photoUrls,
      'needsAttention': needsAttention,
    };
  }
}
```

#### Tree Registration with GPS
```dart
class AddTreePage extends StatefulWidget {
  @override
  _AddTreePageState createState() => _AddTreePageState();
}

class _AddTreePageState extends State<AddTreePage> {
  final _nameController = TextEditingController();
  final _varietyController = TextEditingController();
  Position? _currentPosition;
  bool _isCapturingGPS = false;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Add New Tree'),
        actions: [
          IconButton(
            icon: Icon(Icons.save),
            onPressed: _saveTree,
          ),
        ],
      ),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _nameController,
              decoration: InputDecoration(labelText: 'Tree Name'),
            ),
            TextField(
              controller: _varietyController,
              decoration: InputDecoration(labelText: 'Variety'),
            ),
            
            SizedBox(height: 20),
            
            // GPS Capture Section
            Card(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('GPS Location', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    
                    if (_currentPosition != null) ...[
                      Text('Latitude: ${_currentPosition!.latitude.toStringAsFixed(6)}'),
                      Text('Longitude: ${_currentPosition!.longitude.toStringAsFixed(6)}'),
                      Text('Accuracy: ${_currentPosition!.accuracy.toStringAsFixed(1)}m'),
                      Text('Status: ${_getAccuracyStatus(_currentPosition!.accuracy)}'),
                    ] else ...[
                      Text('No GPS location captured'),
                    ],
                    
                    SizedBox(height: 12),
                    
                    ElevatedButton.icon(
                      onPressed: _isCapturingGPS ? null : _captureGPS,
                      icon: _isCapturingGPS 
                        ? SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(Icons.gps_fixed),
                      label: Text(_isCapturingGPS ? 'Capturing GPS...' : 'Capture GPS'),
                    ),
                  ],
                ),
              ),
            ),
            
            SizedBox(height: 20),
            
            // Camera Section
            ElevatedButton.icon(
              onPressed: _takePhoto,
              icon: Icon(Icons.camera_alt),
              label: Text('Take Photo'),
            ),
          ],
        ),
      ),
    );
  }
  
  Future<void> _captureGPS() async {
    setState(() => _isCapuringGPS = true);
    
    try {
      final position = await GetIt.instance<GPSService>().getCurrentLocation(
        highAccuracy: true
      );
      
      setState(() {
        _currentPosition = position;
        _isCapturingGPS = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('GPS captured with ${position.accuracy.toStringAsFixed(1)}m accuracy'),
          backgroundColor: position.accuracy <= 5 ? Colors.green : Colors.orange,
        ),
      );
    } catch (e) {
      setState(() => _isCapturingGPS = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to capture GPS: $e')),
      );
    }
  }
  
  String _getAccuracyStatus(double accuracy) {
    if (accuracy <= 3) return 'Excellent';
    if (accuracy <= 5) return 'Good';
    if (accuracy <= 10) return 'Fair';
    return 'Poor';
  }
}
```

## Data Models Comparison

### Firebase Firestore Structure
```
farms/{farmId}/
├── trees/{treeId}
│   ├── farmId: string
│   ├── name: string
│   ├── variety: string
│   ├── qrCode: string
│   ├── latitude: number
│   ├── longitude: number
│   ├── gpsAccuracy: number
│   ├── healthStatus: string
│   ├── manualFruitCount: number
│   ├── aiFruitCount: number
│   ├── plantingDate: timestamp
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── zoneId: string
│   ├── photoUrls: array
│   └── needsAttention: boolean
├── zones/{zoneId}
│   ├── name: string
│   ├── color: string
│   ├── boundary: array of geopoints
│   ├── area: number
│   └── treeCount: number
└── photos/{photoId}
    ├── treeId: string
    ├── url: string
    ├── thumbnailUrl: string
    ├── latitude: number
    ├── longitude: number
    ├── timestamp: timestamp
    └── metadata: object
```

## Performance Optimizations

### 1. Map Performance
```dart
// Efficient marker clustering for large datasets
class TreeClusterManager {
  static List<Marker> clusterMarkers(List<Tree> trees, double zoom) {
    if (zoom > 16) {
      // Show individual trees at high zoom
      return trees.map((tree) => TreeMarker(tree: tree)).toList();
    } else {
      // Cluster nearby trees at low zoom
      return _clusterNearbyTrees(trees, zoom);
    }
  }
  
  static List<Marker> _clusterNearbyTrees(List<Tree> trees, double zoom) {
    // Implementation for clustering logic
    // Group trees by proximity and create cluster markers
  }
}
```

### 2. Offline Support
```dart
class OfflineMapService {
  // Download map tiles for offline use
  Future<void> downloadMapArea(LatLngBounds bounds) async {
    // Implementation for offline map tile caching
  }
  
  // Cache tree data for offline access
  Future<void> cacheTreeData(List<Tree> trees) async {
    final db = await DatabaseHelper.database;
    for (final tree in trees) {
      await db.insert('trees', tree.toMap(), 
        conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }
}
```

## Development Phases

### Phase 1: Core Map & GPS (Week 1-2)
- [ ] Flutter project setup with dependencies
- [ ] Basic map implementation with OpenStreetMap
- [ ] GPS service implementation
- [ ] Current location marker
- [ ] Basic tree marker display

### Phase 2: Tree Management (Week 3-4)
- [ ] Tree registration with GPS capture
- [ ] Tree list and detail views
- [ ] Photo capture with GPS metadata
- [ ] Firebase integration for tree data
- [ ] Search and filtering functionality

### Phase 3: Advanced Features (Week 5-6)
- [ ] Zone boundary visualization
- [ ] Tree clustering for performance
- [ ] Offline map support
- [ ] GPS accuracy indicators
- [ ] Advanced tree filtering

### Phase 4: iOS App Comparison (Week 7-8)
- [ ] Feature parity analysis
- [ ] Performance comparison testing
- [ ] UI/UX refinement
- [ ] Data synchronization validation
- [ ] Final optimizations

## Comparison with iOS App

### Feature Parity
| Feature | iOS App | Flutter App | Status |
|---------|---------|-------------|--------|
| Interactive Map | ✅ | 🎯 Planned | Target |
| GPS Tree Registration | ✅ | 🎯 Planned | Target |
| Tree Management | ✅ | 🎯 Planned | Target |
| Photo Capture | ✅ | 🎯 Planned | Target |
| Offline Support | ✅ | 🎯 Planned | Target |
| Zone Management | ✅ | 🎯 Planned | Target |
| Real-time Sync | ✅ | 🎯 Planned | Target |

### Performance Goals
- **Map rendering**: Sub-second load time
- **GPS accuracy**: <5m for tree registration
- **Offline capability**: Full functionality without internet
- **Battery efficiency**: Optimized location services
- **Cross-platform**: Identical functionality on iOS/Android

## Conclusion

This Flutter rebuild focuses on the core strengths of map interaction and GPS-based tree management, providing a streamlined yet powerful alternative to the existing iOS app. The architecture emphasizes performance, offline capability, and cross-platform compatibility while maintaining feature parity with the original application.

The modular design allows for future expansion while keeping the codebase maintainable and the user experience focused on the essential farming operations in the field.