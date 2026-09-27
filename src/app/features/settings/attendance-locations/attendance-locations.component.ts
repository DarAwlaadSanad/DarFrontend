import { Component, OnInit, OnDestroy, signal, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { AttendanceLocationService, AttendanceLocationDTO, CreateAttendanceLocationDTO, UpdateAttendanceLocationDTO } from '../../../core/services/attendance-location.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-attendance-locations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-locations.component.html',
  styleUrls: ['./attendance-locations.component.css']
})
export class AttendanceLocationsComponent implements OnInit, AfterViewInit, OnDestroy {
  private locationService = inject(AttendanceLocationService);
  private ui = inject(UiService);

  locations = signal<AttendanceLocationDTO[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  isGettingCurrentLocation = signal(false);

  displayDialog = signal(false);
  isEditMode = signal(false);

  formData: {
    id?: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    radiusInMeters: number;
    isActive: boolean;
    address: string;
  } = {
    name: '',
    latitude: null,
    longitude: null,
    radiusInMeters: 50,
    isActive: true,
    address: ''
  };

  // Leaflet map instances
  private map: L.Map | null = null;
  private dialogMap: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private dialogMarker: L.Marker | null = null;
  private dialogCircle: L.Circle | null = null;

  private pinIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="transform: translate(-50%, -100%);">
        <div style="background: #10b981; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45); border: 2px solid #ffffff;">
          <svg style="transform: rotate(45deg); width: 18px; height: 18px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });

  private dialogPinIcon = L.divIcon({
    className: 'dialog-map-pin',
    html: `
      <div style="transform: translate(-50%, -100%);">
        <div style="background: #3b82f6; color: white; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.5); border: 2px solid #ffffff;">
          <svg style="transform: rotate(45deg); width: 20px; height: 20px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
        </div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

  ngOnInit(): void {
    this.loadLocations();
  }

  ngAfterViewInit(): void {
    this.initMainMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.dialogMap) {
      this.dialogMap.remove();
      this.dialogMap = null;
    }
  }

  private initMainMap(): void {
    const mapContainer = document.getElementById('locations-overview-map');
    if (!mapContainer || this.map) return;

    // Default center to Egypt / Cairo or center of locations
    this.map = L.map('locations-overview-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([30.0444, 31.2357], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.renderLocationsOnMap();
  }

  loadLocations(): void {
    this.isLoading.set(true);
    this.locationService.getAll().subscribe({
      next: (data) => {
        this.locations.set(data);
        this.isLoading.set(false);
        this.renderLocationsOnMap();
      },
      error: () => {
        this.ui.error('خطأ في تحميل أماكن تسجيل الحضور');
        this.isLoading.set(false);
      }
    });
  }

  private renderLocationsOnMap(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    const locs = this.locations();
    if (locs.length === 0) return;

    const bounds = L.latLngBounds([]);

    locs.forEach(loc => {
      const latLng = L.latLng(loc.latitude, loc.longitude);
      bounds.extend(latLng);

      // Marker
      const marker = L.marker(latLng, { icon: this.pinIcon });
      const popupContent = `
        <div style="text-align: right; font-family: 'Cairo', sans-serif; direction: rtl; min-width: 170px;">
          <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e293b;">${loc.name}</h4>
          ${loc.address ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">${loc.address}</p>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 11px;">
            <span style="color: #64748b;">نطاق الحضور:</span>
            <span style="font-weight: 700; color: #10b981;">${loc.radiusInMeters} متر</span>
          </div>
          <div style="margin-top: 4px; font-size: 11px;">
            <span style="padding: 2px 6px; border-radius: 9999px; ${loc.isActive ? 'background: #dcfce7; color: #15803d;' : 'background: #fee2e2; color: #b91c1c;'}">
              ${loc.isActive ? 'نشط' : 'معطل'}
            </span>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);
      this.markersLayer?.addLayer(marker);

      // Radius circle
      const circle = L.circle(latLng, {
        radius: loc.radiusInMeters,
        color: loc.isActive ? '#10b981' : '#94a3b8',
        fillColor: loc.isActive ? '#10b981' : '#94a3b8',
        fillOpacity: 0.18,
        weight: 2
      });
      this.markersLayer?.addLayer(circle);
    });

    if (locs.length > 0) {
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }

  focusLocationOnMap(loc: AttendanceLocationDTO): void {
    if (!this.map) return;
    this.map.setView([loc.latitude, loc.longitude], 17, { animate: true });
    // Scroll smoothly to map if on mobile
    const mapElement = document.getElementById('locations-overview-map');
    if (mapElement && window.innerWidth < 1024) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  openNewDialog(): void {
    this.formData = {
      name: '',
      latitude: null,
      longitude: null,
      radiusInMeters: 50,
      isActive: true,
      address: ''
    };
    this.isEditMode.set(false);
    this.displayDialog.set(true);

    setTimeout(() => {
      this.initDialogMap(30.0444, 31.2357, false);
      // Auto-fetch current location to facilitate admin adding current center
      this.getCurrentLocationForDialog();
    }, 150);
  }

  editLocation(loc: AttendanceLocationDTO): void {
    this.formData = {
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusInMeters: loc.radiusInMeters,
      isActive: loc.isActive,
      address: loc.address || ''
    };
    this.isEditMode.set(true);
    this.displayDialog.set(true);

    setTimeout(() => {
      this.initDialogMap(loc.latitude, loc.longitude, true);
    }, 150);
  }

  closeDialog(): void {
    this.displayDialog.set(false);
    if (this.dialogMap) {
      this.dialogMap.remove();
      this.dialogMap = null;
      this.dialogMarker = null;
      this.dialogCircle = null;
    }
  }

  private initDialogMap(initLat: number, initLng: number, hasMarker: boolean): void {
    const dialogContainer = document.getElementById('dialog-picker-map');
    if (!dialogContainer) return;

    if (this.dialogMap) {
      this.dialogMap.remove();
      this.dialogMap = null;
    }

    this.dialogMap = L.map('dialog-picker-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([initLat, initLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.dialogMap);

    if (hasMarker && this.formData.latitude !== null && this.formData.longitude !== null) {
      this.updateDialogMarker(this.formData.latitude, this.formData.longitude);
    }

    // Map click handler to select location
    this.dialogMap.on('click', (e: L.LeafletMouseEvent) => {
      this.formData.latitude = parseFloat(e.latlng.lat.toFixed(6));
      this.formData.longitude = parseFloat(e.latlng.lng.toFixed(6));
      this.updateDialogMarker(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate size to ensure proper rendering inside modal
    setTimeout(() => {
      this.dialogMap?.invalidateSize();
    }, 200);
  }

  private updateDialogMarker(lat: number, lng: number): void {
    if (!this.dialogMap) return;

    const latLng = L.latLng(lat, lng);

    if (this.dialogMarker) {
      this.dialogMarker.setLatLng(latLng);
    } else {
      this.dialogMarker = L.marker(latLng, {
        icon: this.dialogPinIcon,
        draggable: true
      }).addTo(this.dialogMap);

      this.dialogMarker.on('dragend', () => {
        if (!this.dialogMarker) return;
        const pos = this.dialogMarker.getLatLng();
        this.formData.latitude = parseFloat(pos.lat.toFixed(6));
        this.formData.longitude = parseFloat(pos.lng.toFixed(6));
        this.updateDialogCircle();
      });
    }

    this.updateDialogCircle();
  }

  updateDialogCircle(): void {
    if (!this.dialogMap || this.formData.latitude === null || this.formData.longitude === null) return;

    const latLng = L.latLng(this.formData.latitude, this.formData.longitude);
    const radius = this.formData.radiusInMeters || 50;

    if (this.dialogCircle) {
      this.dialogCircle.setLatLng(latLng);
      this.dialogCircle.setRadius(radius);
    } else {
      this.dialogCircle = L.circle(latLng, {
        radius: radius,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.22,
        weight: 2
      }).addTo(this.dialogMap);
    }
  }

  onRadiusChange(): void {
    this.updateDialogCircle();
  }

  onCoordsManualInput(): void {
    if (this.formData.latitude !== null && this.formData.longitude !== null && this.dialogMap) {
      this.dialogMap.setView([this.formData.latitude, this.formData.longitude], 16);
      this.updateDialogMarker(this.formData.latitude, this.formData.longitude);
    }
  }

  getCurrentLocationForDialog(): void {
    if (!navigator.geolocation) {
      this.ui.error('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }

    this.isGettingCurrentLocation.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isGettingCurrentLocation.set(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        this.formData.latitude = lat;
        this.formData.longitude = lng;

        if (this.dialogMap) {
          this.dialogMap.setView([lat, lng], 17);
          this.updateDialogMarker(lat, lng);
        }
        this.ui.success('تم التقاط إحداثيات موقعك الحالي بنجاح');
      },
      (err) => {
        this.isGettingCurrentLocation.set(false);
        this.ui.error('تعذر الوصول إلى الموقع الجغرافي. تأكد من تفعيل الـ GPS في جهازك والسماح للمتصفح.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  saveLocation(): void {
    if (!this.formData.name.trim()) {
      this.ui.error('يرجى إدخال اسم الموقع');
      return;
    }
    if (this.formData.latitude === null || this.formData.longitude === null) {
      this.ui.error('يرجى تحديد الموقع على الخريطة أو النقر على "استخدام موقعي الحالي"');
      return;
    }
    if (!this.formData.radiusInMeters || this.formData.radiusInMeters <= 0) {
      this.formData.radiusInMeters = 50;
    }

    this.isSaving.set(true);

    if (this.isEditMode() && this.formData.id) {
      const updateDto: UpdateAttendanceLocationDTO = {
        id: this.formData.id,
        name: this.formData.name.trim(),
        latitude: this.formData.latitude,
        longitude: this.formData.longitude,
        radiusInMeters: this.formData.radiusInMeters,
        isActive: this.formData.isActive,
        address: this.formData.address.trim() || undefined
      };

      this.locationService.update(this.formData.id, updateDto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeDialog();
          this.ui.success('تم تحديث الموقع بنجاح');
          this.loadLocations();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.ui.error(err.error?.message || 'خطأ في تحديث الموقع');
        }
      });
    } else {
      const createDto: CreateAttendanceLocationDTO = {
        name: this.formData.name.trim(),
        latitude: this.formData.latitude,
        longitude: this.formData.longitude,
        radiusInMeters: this.formData.radiusInMeters,
        isActive: this.formData.isActive,
        address: this.formData.address.trim() || undefined
      };

      this.locationService.create(createDto).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeDialog();
          this.ui.success('تم إضافة الموقع الجغرافي بنجاح');
          this.loadLocations();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.ui.error(err.error?.message || 'خطأ في إضافة الموقع');
        }
      });
    }
  }

  toggleActive(loc: AttendanceLocationDTO): void {
    this.locationService.toggle(loc.id).subscribe({
      next: () => {
        loc.isActive = !loc.isActive;
        this.renderLocationsOnMap();
        this.ui.success(`تم ${loc.isActive ? 'تفعيل' : 'تعطيل'} الموقع بنجاح`);
      },
      error: () => this.ui.error('فشل تغيير حالة الموقع')
    });
  }

  deleteLocation(loc: AttendanceLocationDTO): void {
    if (!confirm(`هل أنت متأكد من حذف موقع "${loc.name}"؟ لن يتمكن المعلمون من تسجيل الحضور بناءً على هذا الموقع بعد حذفه.`)) {
      return;
    }

    this.locationService.delete(loc.id).subscribe({
      next: () => {
        this.ui.success('تم حذف الموقع بنجاح');
        this.loadLocations();
      },
      error: () => this.ui.error('خطأ أثناء حذف الموقع')
    });
  }
}
