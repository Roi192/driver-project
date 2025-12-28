import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, Polygon, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { 
  Map, 
  Flame, 
  AlertTriangle, 
  Plus,
  ArrowRight,
  X,
  Crosshair,
  Trash2,
  Route,
  Pencil,
  Search,
  Star,
  MapPinned,
  Building2,
  Layers,
  Navigation,
  Target,
  Shield,
  Eye,
  EyeOff,
  LocateFixed,
  Maximize2
} from "lucide-react";

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create custom icons
const createOutpostIcon = () => {
  return L.divIcon({
    className: "outpost-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border-radius: 50%;
        border: 3px solid #fef3c7;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createEventIcon = () => {
  return L.divIcon({
    className: "event-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        border-radius: 50%;
        border: 3px solid #fed7aa;
        box-shadow: 0 4px 12px rgba(249, 115, 22, 0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" x2="12" y1="9" y2="13"/>
          <line x1="12" x2="12.01" y1="17" y2="17"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createRoutePointIcon = (index: number) => {
  return L.divIcon({
    className: "route-point-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-radius: 50%;
        color: white;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${index + 1}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: "user-location-marker",
    html: `
      <div style="position: relative;">
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 0 2px #3b82f6, 0 4px 12px rgba(59, 130, 246, 0.5);
        "></div>
        <div style="
          position: absolute;
          top: -8px;
          left: -8px;
          width: 36px;
          height: 36px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

interface MapPoint {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  point_type: string;
  severity: string | null;
  is_active: boolean;
}

interface SafetyEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DangerousRoute {
  id: string;
  name: string;
  description: string | null;
  route_points: Array<{ lat: number; lng: number }>;
  severity: string;
  danger_type: string | null;
  is_active: boolean;
}

interface SectorBoundary {
  id: string;
  name: string;
  description: string | null;
  boundary_points: Array<{ lat: number; lng: number }>;
  color: string;
  is_active: boolean;
}

interface ClickPosition {
  lat: number;
  lng: number;
}

// Component to fly to a specific location
const FlyToLocation = ({ position, zoom }: { position: [number, number] | null; zoom?: number }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || 14, { duration: 1 });
    }
  }, [map, position, zoom]);
  
  return null;
};

// Heat layer component
const HeatLayer = ({ points }: { points: Array<[number, number, number]> }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    if (points.length > 0) {
      // @ts-ignore
      heatLayerRef.current = L.heatLayer(points, {
        radius: 50,
        blur: 25,
        maxZoom: 18,
        max: 1.0,
        minOpacity: 0.5,
        gradient: {
          0.0: '#22c55e',
          0.3: '#84cc16',
          0.5: '#eab308',
          0.7: '#f97316',
          0.85: '#ef4444',
          1.0: '#dc2626'
        }
      }).addTo(map);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points]);

  return null;
};

// Map click handler
const MapClickHandler = ({ onMapClick, enabled }: { onMapClick: (pos: ClickPosition) => void; enabled: boolean }) => {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

// Helper to parse route_points
const parseRoutePoints = (points: any): Array<{ lat: number; lng: number }> => {
  if (!points) return [];
  if (Array.isArray(points)) return points;
  if (typeof points === 'string') {
    try {
      return JSON.parse(points);
    } catch {
      return [];
    }
  }
  return [];
};

const KnowTheArea = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const mapRef = useRef<L.Map | null>(null);
  
  // Data states
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [dangerousRoutes, setDangerousRoutes] = useState<DangerousRoute[]>([]);
  const [sectorBoundaries, setSectorBoundaries] = useState<SectorBoundary[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);
  
  // View/Filter states
  const [viewMode, setViewMode] = useState<"map" | "heatmap">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOutposts, setShowOutposts] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  
  // Map click context menu
  const [showMapClickMenu, setShowMapClickMenu] = useState(false);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  
  // Route drawing states
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<ClickPosition[]>([]);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  
  // Sector boundary drawing states
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<ClickPosition[]>([]);
  const [showBoundaryDialog, setShowBoundaryDialog] = useState(false);
  
  // Edit mode states
  const [editingRoute, setEditingRoute] = useState<DangerousRoute | null>(null);
  const [editingEvent, setEditingEvent] = useState<SafetyEvent | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    point_type: "outpost",
    severity: "medium",
  });
  
  const [routeFormData, setRouteFormData] = useState({
    name: "",
    description: "",
    severity: "high",
    danger_type: "general",
  });
  
  const [boundaryFormData, setBoundaryFormData] = useState({
    name: "",
    description: "",
    color: "#000000",
  });
  
  const [eventFormData, setEventFormData] = useState({
    title: "",
    description: "",
    category: "other" as "fire" | "accident" | "weapon" | "vehicle" | "other",
    event_date: new Date().toISOString().split('T')[0],
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
        },
        (error) => {
          console.log("Location access denied or unavailable");
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [pointsRes, eventsRes, routesRes, boundariesRes] = await Promise.all([
        supabase.from("map_points_of_interest").select("*").eq("is_active", true),
        supabase.from("safety_events").select("*").order("event_date", { ascending: false }).limit(100),
        supabase.from("dangerous_routes").select("*").eq("is_active", true),
        supabase.from("sector_boundaries").select("*").eq("is_active", true),
      ]);
      
      if (pointsRes.data) setMapPoints(pointsRes.data);
      if (eventsRes.data) setSafetyEvents(eventsRes.data as SafetyEvent[]);
      if (routesRes.data) {
        const routes = routesRes.data.map((route: any) => ({
          ...route,
          route_points: parseRoutePoints(route.route_points),
        }));
        setDangerousRoutes(routes);
      }
      if (boundariesRes.data) {
        const boundaries = boundariesRes.data.map((b: any) => ({
          ...b,
          boundary_points: parseRoutePoints(b.boundary_points),
        }));
        setSectorBoundaries(boundaries);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredOutposts = useMemo(() => {
    return mapPoints
      .filter(p => p.point_type === "outpost" || p.point_type === "checkpoint")
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [mapPoints, searchQuery]);

  const filteredEvents = useMemo(() => {
    return safetyEvents.filter(e => 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [safetyEvents, searchQuery]);

  const filteredRoutes = useMemo(() => {
    return dangerousRoutes.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [dangerousRoutes, searchQuery]);

  const eventsWithLocation = useMemo(() => {
    return filteredEvents.filter(e => e.latitude && e.longitude);
  }, [filteredEvents]);

  // Calculate center
  const outposts = mapPoints.filter(p => p.point_type === "outpost");
  const centerLat = userLocation ? userLocation[0] : 
    outposts.length > 0 ? outposts.reduce((sum, p) => sum + p.latitude, 0) / outposts.length : 31.9;
  const centerLng = userLocation ? userLocation[1] :
    outposts.length > 0 ? outposts.reduce((sum, p) => sum + p.longitude, 0) / outposts.length : 35.2;

  // Handlers
  const handleMapClick = (pos: ClickPosition) => {
    if (isDrawingRoute) {
      setRoutePoints(prev => [...prev, pos]);
    } else if (isDrawingBoundary) {
      setBoundaryPoints(prev => [...prev, pos]);
    } else if (isAdmin) {
      setClickPosition(pos);
      setShowMapClickMenu(true);
    }
  };

  const handleAddOutpostFromMenu = () => {
    setShowMapClickMenu(false);
    setShowAddDialog(true);
  };

  const handleAddEventFromMenu = () => {
    setShowMapClickMenu(false);
    if (clickPosition) {
      setEventFormData(prev => ({ 
        ...prev, 
        latitude: clickPosition.lat, 
        longitude: clickPosition.lng 
      }));
    }
    setShowAddEventDialog(true);
  };

  const handleFocusOnItem = (lat: number, lng: number) => {
    setFlyToPosition([lat, lng]);
    setTimeout(() => setFlyToPosition(null), 1500);
  };

  const handleFocusOnRoute = (route: DangerousRoute) => {
    if (route.route_points.length > 0) {
      const midIndex = Math.floor(route.route_points.length / 2);
      const midPoint = route.route_points[midIndex];
      handleFocusOnItem(midPoint.lat, midPoint.lng);
    }
  };

  const handleGoToUserLocation = () => {
    if (userLocation) {
      setFlyToPosition(userLocation);
      setTimeout(() => setFlyToPosition(null), 1500);
    } else {
      toast.error("לא ניתן לאתר את המיקום שלך");
    }
  };

  const handleStartDrawingRoute = () => {
    setIsDrawingRoute(true);
    setRoutePoints([]);
    toast.info("לחץ על המפה להוספת נקודות לציר");
  };

  const handleFinishDrawingRoute = () => {
    if (routePoints.length < 2) {
      toast.error("יש להוסיף לפחות 2 נקודות");
      return;
    }
    setIsDrawingRoute(false);
    setShowRouteDialog(true);
  };

  const handleCancelDrawingRoute = () => {
    setIsDrawingRoute(false);
    setRoutePoints([]);
  };

  const handleSaveRoute = async () => {
    if (!routeFormData.name.trim()) {
      toast.error("יש למלא את שם הציר");
      return;
    }

    try {
      const { error } = await supabase.from("dangerous_routes").insert([{
        name: routeFormData.name,
        description: routeFormData.description || null,
        route_points: JSON.stringify(routePoints),
        severity: routeFormData.severity,
        danger_type: routeFormData.danger_type,
        is_active: true,
        created_by: user?.id,
      }]);

      if (error) throw error;

      toast.success("הציר נוסף בהצלחה");
      setShowRouteDialog(false);
      setRoutePoints([]);
      setRouteFormData({ name: "", description: "", severity: "high", danger_type: "general" });
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בהוספת הציר");
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm("האם למחוק את הציר?")) return;
    try {
      const { error } = await supabase.from("dangerous_routes").delete().eq("id", id);
      if (error) throw error;
      toast.success("הציר נמחק");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleEditRoute = (route: DangerousRoute) => {
    setEditingRoute(route);
    setRouteFormData({
      name: route.name,
      description: route.description || "",
      severity: route.severity,
      danger_type: route.danger_type || "general",
    });
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute || !routeFormData.name.trim()) {
      toast.error("יש למלא את שם הציר");
      return;
    }
    try {
      const { error } = await supabase.from("dangerous_routes").update({
        name: routeFormData.name,
        description: routeFormData.description || null,
        severity: routeFormData.severity,
        danger_type: routeFormData.danger_type,
      }).eq("id", editingRoute.id);
      if (error) throw error;
      toast.success("הציר עודכן");
      setEditingRoute(null);
      setRouteFormData({ name: "", description: "", severity: "high", danger_type: "general" });
      fetchData();
    } catch (error) {
      toast.error("שגיאה בעדכון");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("האם למחוק את האירוע?")) return;
    try {
      const { error } = await supabase.from("safety_events").delete().eq("id", id);
      if (error) throw error;
      toast.success("האירוע נמחק");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleEditEvent = (event: SafetyEvent) => {
    setEditingEvent(event);
    setEventFormData({
      title: event.title,
      description: event.description || "",
      category: event.category as any,
      event_date: event.event_date || new Date().toISOString().split('T')[0],
      latitude: event.latitude,
      longitude: event.longitude,
    });
    setShowAddEventDialog(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !eventFormData.title.trim()) {
      toast.error("יש למלא את כותרת האירוע");
      return;
    }
    try {
      const { error } = await supabase.from("safety_events").update({
        title: eventFormData.title,
        description: eventFormData.description || null,
        category: eventFormData.category,
        event_date: eventFormData.event_date,
        latitude: eventFormData.latitude,
        longitude: eventFormData.longitude,
      }).eq("id", editingEvent.id);
      if (error) throw error;
      toast.success("האירוע עודכן");
      setShowAddEventDialog(false);
      setEditingEvent(null);
      setEventFormData({ title: "", description: "", category: "other", event_date: new Date().toISOString().split('T')[0], latitude: null, longitude: null });
      fetchData();
    } catch (error) {
      toast.error("שגיאה בעדכון");
    }
  };

  const handleAddPoint = async () => {
    if (!clickPosition || !formData.name.trim()) {
      toast.error("יש למלא את שם הנקודה");
      return;
    }

    try {
      const { error } = await supabase.from("map_points_of_interest").insert({
        name: formData.name,
        description: formData.description || null,
        latitude: clickPosition.lat,
        longitude: clickPosition.lng,
        point_type: formData.point_type,
        severity: formData.point_type === "danger_zone" ? formData.severity : null,
        is_active: true,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("הנקודה נוספה בהצלחה");
      setShowAddDialog(false);
      setClickPosition(null);
      setFormData({ name: "", description: "", point_type: "outpost", severity: "medium" });
      fetchData();
    } catch (error) {
      toast.error("שגיאה בהוספה");
    }
  };

  const handleDeletePoint = async (id: string) => {
    try {
      const { error } = await supabase.from("map_points_of_interest").delete().eq("id", id);
      if (error) throw error;
      toast.success("נמחק בהצלחה");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  // Sector boundary handlers
  const handleStartDrawingBoundary = () => {
    setIsDrawingBoundary(true);
    setBoundaryPoints([]);
    toast.info("לחץ על המפה להוספת נקודות גבול");
  };

  const handleFinishDrawingBoundary = () => {
    if (boundaryPoints.length < 3) {
      toast.error("יש להוסיף לפחות 3 נקודות לגבול");
      return;
    }
    setIsDrawingBoundary(false);
    setShowBoundaryDialog(true);
  };

  const handleCancelDrawingBoundary = () => {
    setIsDrawingBoundary(false);
    setBoundaryPoints([]);
  };

  const handleSaveBoundary = async () => {
    if (!boundaryFormData.name.trim()) {
      toast.error("יש למלא את שם הגבול");
      return;
    }

    try {
      const { error } = await supabase.from("sector_boundaries").insert([{
        name: boundaryFormData.name,
        description: boundaryFormData.description || null,
        boundary_points: JSON.stringify(boundaryPoints),
        color: boundaryFormData.color,
        is_active: true,
        created_by: user?.id,
      }]);

      if (error) throw error;

      toast.success("גבול הגזרה נוסף בהצלחה");
      setShowBoundaryDialog(false);
      setBoundaryPoints([]);
      setBoundaryFormData({ name: "", description: "", color: "#000000" });
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בהוספת הגבול");
    }
  };

  const handleDeleteBoundary = async (id: string) => {
    try {
      const { error } = await supabase.from("sector_boundaries").delete().eq("id", id);
      if (error) throw error;
      toast.success("גבול הגזרה נמחק");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  // Add safety event handler
  const handleAddSafetyEvent = async () => {
    if (editingEvent) {
      await handleUpdateEvent();
      return;
    }
    
    if (!eventFormData.title.trim()) {
      toast.error("יש למלא את כותרת האירוע");
      return;
    }

    try {
      const { error } = await supabase.from("safety_events").insert([{
        title: eventFormData.title,
        description: eventFormData.description || null,
        category: eventFormData.category,
        event_date: eventFormData.event_date,
        latitude: eventFormData.latitude,
        longitude: eventFormData.longitude,
      }]);

      if (error) throw error;

      toast.success("אירוע הבטיחות נוסף בהצלחה");
      setShowAddEventDialog(false);
      setEventFormData({ title: "", description: "", category: "other", event_date: new Date().toISOString().split('T')[0], latitude: null, longitude: null });
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בהוספת האירוע");
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      fire: "שריפה", accident: "תאונה", weapon: "נשק", vehicle: "רכב", other: "אחר"
    };
    return labels[category] || "אחר";
  };

  // Build heat map points
  const heatPoints = useMemo(() => {
    const points: Array<[number, number, number]> = [];
    const eventsWithCoords = safetyEvents.filter(e => e.latitude && e.longitude);
    
    eventsWithCoords.forEach(e => {
      if (e.latitude && e.longitude) {
        const nearbyCount = eventsWithCoords.filter(other => {
          if (!other.latitude || !other.longitude) return false;
          const latDiff = Math.abs(other.latitude - e.latitude!);
          const lngDiff = Math.abs(other.longitude - e.longitude!);
          return latDiff < 0.01 && lngDiff < 0.01;
        }).length;
        
        const intensity = nearbyCount >= 2 ? 1.0 : nearbyCount === 1 ? 0.5 : 0.25;
        points.push([e.latitude, e.longitude, intensity]);
      }
    });
    
    return points;
  }, [safetyEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <Map className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-lg">
        <div className="flex items-center justify-between h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">הכר את הגזרה</h1>
          </div>
          
          <div className="w-10" />
        </div>
      </header>

      <main className="pb-8">
        {/* Stats Cards */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Outposts Card */}
            <div className="premium-card p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{filteredOutposts.length}</div>
              <div className="text-xs text-muted-foreground font-medium">מוצבים</div>
            </div>

            {/* Routes Card */}
            <div className="premium-card p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{filteredRoutes.length}</div>
              <div className="text-xs text-muted-foreground font-medium">צירים אדומים</div>
            </div>

            {/* Events Card */}
            <div className="premium-card p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{eventsWithLocation.length}</div>
              <div className="text-xs text-muted-foreground font-medium">אירועי בטיחות</div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-4 space-y-3 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש במפה..."
              className="pr-12 h-12 bg-card border-border rounded-2xl text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* View Mode & Filters */}
          <div className="flex gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex p-1 bg-card rounded-xl border border-border">
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  viewMode === "map"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="w-4 h-4" />
                מפה
              </button>
              <button
                onClick={() => setViewMode("heatmap")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  viewMode === "heatmap"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className="w-4 h-4" />
                חום
              </button>
            </div>

            {/* Filter Toggles */}
            <div className="flex gap-2 flex-1 overflow-x-auto">
              <button
                onClick={() => setShowOutposts(!showOutposts)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap",
                  showOutposts
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-700"
                    : "bg-muted/50 border-border text-muted-foreground"
                )}
              >
                {showOutposts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                מוצבים
              </button>
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap",
                  showRoutes
                    ? "bg-red-500/20 border-red-500/50 text-red-700"
                    : "bg-muted/50 border-border text-muted-foreground"
                )}
              >
                {showRoutes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                צירים
              </button>
              <button
                onClick={() => setShowEvents(!showEvents)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap",
                  showEvents
                    ? "bg-orange-500/20 border-orange-500/50 text-orange-700"
                    : "bg-muted/50 border-border text-muted-foreground"
                )}
              >
                {showEvents ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                אירועים
              </button>
            </div>
          </div>
        </div>

        {/* Admin Drawing Controls */}
        {isAdmin && (
          <div className="px-4 mb-4">
            {isDrawingRoute ? (
              <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <Pencil className="w-5 h-5 text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">מצייר ציר מסוכן</p>
                      <p className="text-sm text-muted-foreground">{routePoints.length} נקודות</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelDrawingRoute}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleFinishDrawingRoute} disabled={routePoints.length < 2}
                      className="bg-red-500 hover:bg-red-600 text-white">
                      סיים
                    </Button>
                  </div>
                </div>
              </div>
            ) : isDrawingBoundary ? (
              <div className="glass-card p-4 border-foreground/30 bg-foreground/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-foreground/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-foreground animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">מצייר גבול גזרה</p>
                      <p className="text-sm text-muted-foreground">{boundaryPoints.length} נקודות</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelDrawingBoundary}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleFinishDrawingBoundary} disabled={boundaryPoints.length < 3}>
                      סיים
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleStartDrawingRoute} className="gap-2">
                  <Route className="w-4 h-4 text-red-500" />
                  צייר ציר מסוכן
                </Button>
                <Button size="sm" variant="outline" onClick={handleStartDrawingBoundary} className="gap-2">
                  <Shield className="w-4 h-4" />
                  צייר גבול גזרה
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Map Container */}
        <div className="px-4 mb-4">
          <div className="relative h-[55vh] rounded-3xl overflow-hidden border-2 border-border shadow-2xl">
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={userLocation ? 13 : 11}
              className="h-full w-full"
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler 
                onMapClick={handleMapClick} 
                enabled={isAdmin || isDrawingRoute || isDrawingBoundary} 
              />
              
              <FlyToLocation position={flyToPosition} />
              
              {/* User Location */}
              {userLocation && (
                <>
                  <Marker position={userLocation} icon={createUserLocationIcon()}>
                    <Popup>
                      <div className="text-center p-2" dir="rtl">
                        <p className="font-bold">המיקום שלך</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle 
                    center={userLocation} 
                    radius={100} 
                    pathOptions={{ 
                      color: '#3b82f6', 
                      fillColor: '#3b82f6', 
                      fillOpacity: 0.1,
                      weight: 2
                    }} 
                  />
                </>
              )}
              
              {/* Sector Boundaries */}
              {showBoundaries && sectorBoundaries.map((boundary) => (
                <Polygon
                  key={boundary.id}
                  positions={boundary.boundary_points.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ 
                    color: boundary.color || '#000000', 
                    weight: 4, 
                    opacity: 0.9, 
                    fillOpacity: 0.1,
                  }}
                >
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{boundary.name}</h3>
                      <Badge className="mb-2" style={{ backgroundColor: boundary.color }}>גבול גזרה</Badge>
                      {boundary.description && <p className="text-sm text-gray-600 mt-2">{boundary.description}</p>}
                      {isAdmin && (
                        <Button variant="destructive" size="sm" className="w-full mt-3" onClick={() => handleDeleteBoundary(boundary.id)}>
                          <Trash2 className="w-4 h-4 ml-2" />מחק
                        </Button>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              ))}
              
              {/* Boundary drawing preview */}
              {isDrawingBoundary && boundaryPoints.length > 0 && (
                <Polygon
                  positions={boundaryPoints.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: '#000000', weight: 3, opacity: 0.6, fillOpacity: 0.1, dashArray: '10, 10' }}
                />
              )}
              
              {/* Boundary drawing points */}
              {isDrawingBoundary && boundaryPoints.map((point, idx) => (
                <Marker key={idx} position={[point.lat, point.lng]} icon={createRoutePointIcon(idx)} />
              ))}
              
              {/* Heat layer for heatmap mode */}
              {viewMode === "heatmap" && <HeatLayer points={heatPoints} />}
              
              {/* Dangerous Routes */}
              {showRoutes && dangerousRoutes.map((route) => (
                <Polyline
                  key={route.id}
                  positions={route.route_points.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 6,
                    opacity: 0.9,
                  }}
                >
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{route.name}</h3>
                      <Badge className="bg-red-500 text-white mb-2">ציר מסוכן</Badge>
                      {route.description && <p className="text-sm text-gray-600 mt-2">{route.description}</p>}
                      {isAdmin && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditRoute(route)}>
                            <Pencil className="w-4 h-4 ml-1" />עריכה
                          </Button>
                          <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteRoute(route.id)}>
                            <Trash2 className="w-4 h-4 ml-1" />מחק
                          </Button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              ))}
              
              {/* Route drawing preview */}
              {isDrawingRoute && routePoints.length > 0 && (
                <Polyline
                  positions={routePoints.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.6, dashArray: '10, 10' }}
                />
              )}
              
              {/* Route drawing points */}
              {isDrawingRoute && routePoints.map((point, idx) => (
                <Marker key={idx} position={[point.lat, point.lng]} icon={createRoutePointIcon(idx)} />
              ))}
              
              {/* Outposts */}
              {showOutposts && filteredOutposts.map((point) => (
                <Marker key={point.id} position={[point.latitude, point.longitude]} icon={createOutpostIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{point.name}</h3>
                      <Badge className="bg-amber-500 text-white mb-2">מוצב</Badge>
                      {point.description && <p className="text-sm text-gray-600 mt-2">{point.description}</p>}
                      {isAdmin && (
                        <Button variant="destructive" size="sm" className="w-full mt-3" onClick={() => handleDeletePoint(point.id)}>
                          <Trash2 className="w-4 h-4 ml-2" />מחק
                        </Button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Safety Events with coordinates */}
              {showEvents && viewMode === "map" && eventsWithLocation.map((event) => (
                <Marker key={event.id} position={[event.latitude!, event.longitude!]} icon={createEventIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                      <Badge className="bg-orange-500 text-white mb-2">{getCategoryLabel(event.category)}</Badge>
                      {event.event_date && <p className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString("he-IL")}</p>}
                      {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}
                      {isAdmin && (
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditEvent(event)}>
                            <Pencil className="w-4 h-4 ml-1" />עריכה
                          </Button>
                          <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 className="w-4 h-4 ml-1" />מחק
                          </Button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Controls Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000]">
              <Button
                size="icon"
                variant="secondary"
                onClick={handleGoToUserLocation}
                className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-sm shadow-lg border border-border"
              >
                <LocateFixed className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Heat Map Legend */}
        {viewMode === "heatmap" && (
          <div className="px-4 mb-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold text-foreground">מקרא מפת חום</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden bg-muted">
                <div className="h-full w-full" style={{
                  background: 'linear-gradient(to left, #dc2626, #ef4444, #f97316, #eab308, #84cc16, #22c55e)'
                }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>ללא אירועים</span>
                <span>אירוע בודד</span>
                <span>ריבוי אירועים</span>
              </div>
            </div>
          </div>
        )}

        {/* Lists Section */}
        <div className="px-4 space-y-4">
          {/* Quick List - Recent Events */}
          {eventsWithLocation.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                אירועי בטיחות אחרונים
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {eventsWithLocation.slice(0, 5).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleFocusOnItem(event.latitude!, event.longitude!)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground text-sm">{event.title}</p>
                        {event.event_date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.event_date).toLocaleDateString("he-IL")}
                          </p>
                        )}
                      </div>
                    </div>
                    <MapPinned className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick List - Dangerous Routes */}
          {filteredRoutes.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Route className="w-5 h-5 text-red-500" />
                צירים אדומים
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {filteredRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleFocusOnRoute(route)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Route className="w-4 h-4 text-red-500" />
                      </div>
                      <p className="font-medium text-foreground text-sm">{route.name}</p>
                    </div>
                    <MapPinned className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Map Click Context Menu Dialog */}
      <Dialog open={showMapClickMenu} onOpenChange={setShowMapClickMenu}>
        <DialogContent className="max-w-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">הוסף לנקודה זו</DialogTitle>
            <DialogDescription className="text-center">
              {clickPosition && (
                <span className="text-xs font-mono">
                  {clickPosition.lat.toFixed(5)}, {clickPosition.lng.toFixed(5)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleAddOutpostFromMenu}
            >
              <Building2 className="w-8 h-8 text-amber-500" />
              <span>מוצב</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleAddEventFromMenu}
            >
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <span>אירוע בטיחות</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Outpost Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת מוצב</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם המוצב</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
            {clickPosition && (
              <div className="p-3 rounded-xl bg-muted text-center">
                <p className="text-sm text-muted-foreground">קואורדינטות:</p>
                <p className="font-mono text-sm">{clickPosition.lat.toFixed(5)}, {clickPosition.lng.toFixed(5)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>ביטול</Button>
            <Button onClick={handleAddPoint}>הוסף</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Event Dialog */}
      <Dialog open={showAddEventDialog} onOpenChange={(open) => {
        setShowAddEventDialog(open);
        if (!open) {
          setEditingEvent(null);
          setEventFormData({ title: "", description: "", category: "other", event_date: new Date().toISOString().split('T')[0], latitude: null, longitude: null });
        }
      }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "עריכת אירוע בטיחות" : "הוספת אירוע בטיחות"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={eventFormData.title}
                onChange={(e) => setEventFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="כותרת האירוע..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={eventFormData.description}
                onChange={(e) => setEventFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור האירוע..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תאריך</Label>
              <Input
                type="date"
                value={eventFormData.event_date}
                onChange={(e) => setEventFormData(p => ({ ...p, event_date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>מיקום</Label>
              {eventFormData.latitude && eventFormData.longitude ? (
                <div className="mt-1 p-3 rounded-xl bg-muted flex items-center justify-between">
                  <span className="font-mono text-sm">
                    {eventFormData.latitude.toFixed(5)}, {eventFormData.longitude.toFixed(5)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEventFormData(p => ({ ...p, latitude: null, longitude: null }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="any"
                    placeholder="קו רוחב"
                    onChange={(e) => setEventFormData(p => ({ ...p, latitude: parseFloat(e.target.value) || null }))}
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="קו אורך"
                    onChange={(e) => setEventFormData(p => ({ ...p, longitude: parseFloat(e.target.value) || null }))}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEventDialog(false)}>ביטול</Button>
            <Button onClick={handleAddSafetyEvent}>
              {editingEvent ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Route Dialog */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>שמירת ציר מסוכן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הציר</Label>
              <Input
                value={routeFormData.name}
                onChange={(e) => setRouteFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={routeFormData.description}
                onChange={(e) => setRouteFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-sm text-muted-foreground">{routePoints.length} נקודות בציר</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveRoute} className="bg-red-500 hover:bg-red-600">שמור ציר</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת ציר מסוכן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הציר</Label>
              <Input
                value={routeFormData.name}
                onChange={(e) => setRouteFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={routeFormData.description}
                onChange={(e) => setRouteFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoute(null)}>ביטול</Button>
            <Button onClick={handleUpdateRoute}>עדכן</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Boundary Dialog */}
      <Dialog open={showBoundaryDialog} onOpenChange={setShowBoundaryDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>שמירת גבול גזרה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הגבול</Label>
              <Input
                value={boundaryFormData.name}
                onChange={(e) => setBoundaryFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={boundaryFormData.description}
                onChange={(e) => setBoundaryFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>צבע</Label>
              <div className="flex gap-2 mt-1">
                {['#000000', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setBoundaryFormData(p => ({ ...p, color }))}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 transition-all",
                      boundaryFormData.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-sm text-muted-foreground">{boundaryPoints.length} נקודות בגבול</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBoundaryDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveBoundary}>שמור גבול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSS for user location pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};

export default KnowTheArea;