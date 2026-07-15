# GPS Tracking Solution for iOS Browsers

> Status: Proposal
> Baseline: package `0.1.0`, Git commit `7890775`
> Last reviewed: 2026-07-15

## Current Implementation Notice

Capacitor and native background geolocation described here are proposals and are not installed in the active runtime. The current implementation provides foreground web GPS only; iOS background tracking remains unreliable.

## 🎯 Vấn đề hiện tại

GPS Tracking không hoạt động trên iOS Safari vì:
1. iOS yêu cầu user gesture để kích hoạt geolocation
2. Background tracking không được hỗ trợ trong web browsers
3. `watchPosition()` thường bị timeout hoặc không update
4. Permissions API không đầy đủ

## ✅ Giải pháp được đề xuất

### 1. **Sử dụng Capacitor Geolocation Plugin** (Khuyến nghị cao nhất)

**Ưu điểm:**
- Native GPS access trên iOS
- Background tracking thực sự
- Battery optimization tốt hơn
- Permissions handling chuẩn iOS
- Hỗ trợ đầy đủ iOS features

**Cài đặt:**
```bash
npm install @capacitor/geolocation
npx cap sync
```

**Implementation:**
```typescript
import { Geolocation } from '@capacitor/geolocation';

// Request permissions
const permissions = await Geolocation.requestPermissions();

// Watch position
const watchId = await Geolocation.watchPosition(
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  (position, err) => {
    if (position) {
      console.log('Position:', position);
    }
  }
);

// Clear watch
await Geolocation.clearWatch({ id: watchId });
```

### 2. **Progressive Web App (PWA) với Service Worker**

**Ưu điểm:**
- Không cần app store
- Hoạt động offline
- Background sync khi app mở lại
- Add to Home Screen

**Cài đặt:**
```bash
npm install next-pwa
```

**Configuration:**
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // your next config
});
```

### 3. **Optimized Web Geolocation API** (Fallback solution)

**Best practices cho iOS:**

```typescript
// ✅ ĐÚNG: Sử dụng watchPosition với timeout ngắn
const watchId = navigator.geolocation.watchPosition(
  successCallback,
  errorCallback,
  {
    enableHighAccuracy: true,
    timeout: 5000,        // Ngắn hơn cho iOS
    maximumAge: 0         // Luôn lấy vị trí mới
  }
);

// ❌ SAI: Sử dụng getCurrentPosition trong setInterval
setInterval(() => {
  navigator.geolocation.getCurrentPosition(...);
}, 2000);
```

### 4. **Hybrid Approach: Capacitor + PWA**

Kết hợp cả hai để có trải nghiệm tốt nhất:
- Native app với Capacitor cho background tracking
- PWA cho web access
- Shared codebase

## 🔧 Implementation Plan

### Phase 1: Immediate Fix (Web-only)
1. Fix `useOptimizedPositioning` hook
2. Improve permission handling
3. Add iOS-specific optimizations
4. Better error messages

### Phase 2: PWA Enhancement
1. Add PWA manifest
2. Implement service worker
3. Add offline support
4. Background sync

### Phase 3: Native App (Optional)
1. Setup Capacitor
2. Implement native geolocation
3. Add background tracking
4. Submit to App Store

## 📱 iOS-Specific Considerations

### Permission Handling
```typescript
// iOS không hỗ trợ permissions.query() đầy đủ
// Phải request trực tiếp
const requestPermission = async () => {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    return 'granted';
  } catch (error) {
    if (error.code === 1) return 'denied';
    return 'prompt';
  }
};
```

### Battery Optimization
```typescript
// Điều chỉnh accuracy dựa trên battery level
const getBatteryOptimizedOptions = async () => {
  const battery = await navigator.getBattery?.();
  const lowBattery = battery && battery.level < 0.2;
  
  return {
    enableHighAccuracy: !lowBattery,
    timeout: lowBattery ? 10000 : 5000,
    maximumAge: lowBattery ? 30000 : 0
  };
};
```

### Wake Lock (Keep screen on)
```typescript
// Giữ màn hình sáng khi tracking
let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch (err) {
    console.error('Wake Lock error:', err);
  }
};
```

## 🎯 Recommended Solution

**For immediate fix:** Implement Phase 1 (Web-only improvements)
**For best experience:** Implement Phase 2 (PWA) + Phase 3 (Capacitor native app)

## 📊 Comparison Table

| Feature | Current Web API | PWA | Capacitor Native |
|---------|----------------|-----|------------------|
| iOS Support | ⚠️ Limited | ✅ Good | ✅ Excellent |
| Background Tracking | ❌ No | ⚠️ Limited | ✅ Yes |
| Battery Efficiency | ⚠️ Medium | ✅ Good | ✅ Excellent |
| Offline Support | ❌ No | ✅ Yes | ✅ Yes |
| App Store | ❌ No | ❌ No | ✅ Yes |
| Development Effort | ✅ Low | ⚠️ Medium | ⚠️ High |
| Maintenance | ✅ Easy | ⚠️ Medium | ⚠️ Complex |

## 🚀 Next Steps

1. Review and approve solution approach
2. Implement Phase 1 fixes
3. Test on real iOS devices
4. Decide on PWA vs Native app
5. Implement chosen solution
