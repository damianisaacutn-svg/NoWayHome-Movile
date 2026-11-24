// src/screens/EditarPropiedadScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/config/api';
import { authService } from '@/services/authService';
import { notificarPropiedadActualizada } from '@/services/notificationSyncService';
import {
  getLandlordId,
  getStoredSessionUser,
  getTenantId,
  hasValidId,
  resolveUserRole,
} from '@/utils/sessionRole';
import { BottomTabBar } from '../../components/BottomTabBar';
import { ConfirmActionModal } from '../../components/ConfirmActionModal';
import { HeaderArrendatario } from '../../components/headerArrendatario';
import { PropertyLocationMap } from '../../components/locacionPropiedadMap';
import { geocodeAddress } from '../../services/geocodeService';
import {
  deletePropertyImage,
  getPropertyById,
  replacePropertyImage,
  updateProperty,
} from '../../services/propertyService';

// ---------------------------------------------------------------------------
// TIPOS E INTERFACES
// ---------------------------------------------------------------------------

export type PriceType = 'noche' | 'mensual';
export type PropertyState = 'activa' | 'inactiva' | 'suspendida';

export interface PropertyFormState {
  titulo: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  pais: string;
  tipo_precio: PriceType;
  precio_por_noche: string;
  capacidad: string;
  numero_habitaciones: string;
  numero_banos: string;
  latitud: string;
  longitud: string;
  estado: PropertyState;
}

export interface PropertyImage {
  id_imagen: string | number;
  url: string;
  es_principal?: boolean;
  [key: string]: unknown;
}

export interface NewPropertyImage {
  id: string;
  uri: string;
  name: string;
  type: string;
  size?: number;
  previewUrl: string;
  file?: File;
}

export interface UserData {
  id?: string | number;
  id_arrendatario?: string | number;
  role?: string;
  rol?: string;
  [key: string]: unknown;
}

export interface GeocodeState {
  isLoading: boolean;
  type: 'success' | 'error' | '';
  message: string;
}

export interface ConfirmActionState {
  open: boolean;
  type: 'delete' | 'replace' | '';
  image: PropertyImage | null;
  file: NewPropertyImage | null;
}

export interface ActionMessageState {
  open: boolean;
  type: 'success' | 'error' | '';
  title: string;
  description: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

export type RootStackParamList = {
  EditarPropiedad: { id: string };
  Login: undefined;
  Profile: undefined;
  PropiedadesList: undefined;
};

// ---------------------------------------------------------------------------
// CONSTANTES Y UTILIDADES
// ---------------------------------------------------------------------------

const initialForm: PropertyFormState = {
  titulo: '',
  descripcion: '',
  direccion: '',
  ciudad: '',
  pais: '',
  tipo_precio: 'noche',
  precio_por_noche: '',
  capacidad: '',
  numero_habitaciones: '',
  numero_banos: '',
  latitud: '',
  longitud: '',
  estado: 'activa',
};

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;
const allowedPriceTypes: string[] = ['noche', 'mensual'];
const locationFoundMessage = 'Ubicación encontrada. Puedes ajustar el marcador antes de guardar.';
const locationNotFoundMessage =
  'No se encontró una ubicación para esa dirección. Intenta ser más específico.';
const locationSearchFailedMessage =
  'No pudimos buscar la ubicación en este momento. Intenta nuevamente.';

function isValidOptionalCoordinate(
  value: string | number | null | undefined,
  min: number,
  max: number
): boolean {
  if (value === null || value === undefined || value === '') return true;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

function normalizeOptionalNumber(value: string): string {
  return value === '' ? '' : String(Number(value));
}

function serializeEditableDetails(formState: PropertyFormState): string {
  const { estado: _estado, ...editable } = formState;
  return JSON.stringify(editable);
}

function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  image: NewPropertyImage,
) {
  if (Platform.OS === 'web') {
    if (image.file) {
      formData.append(fieldName, image.file, image.name);
      return;
    }
    const response = await fetch(image.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, image.name);
    return;
  }

  formData.append(fieldName, {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as unknown as Blob);
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export function EditarPropiedad() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [sessionUser, setSessionUser] = useState<UserData | null>(
    () => getStoredSessionUser() as UserData | null
  );
  const [sessionRole, setSessionRole] = useState<string | null>(
    () => authService.getSession()?.role ?? null
  );
  const [form, setForm] = useState<PropertyFormState>(initialForm);
  const [currentImages, setCurrentImages] = useState<PropertyImage[]>([]);
  const [newImages, setNewImages] = useState<NewPropertyImage[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [, setMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [geocodeState, setGeocodeState] = useState<GeocodeState>({
    isLoading: false,
    type: '',
    message: '',
  });
  const [deletingImageId, setDeletingImageId] = useState<string | number | null>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | number | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState>({
    open: false,
    type: '',
    image: null,
    file: null,
  });
  const [actionMessage, setActionMessage] = useState<ActionMessageState>({
    open: false,
    type: '',
    title: '',
    description: '',
  });

  const imageSeqRef = useRef<number>(0);
  const initialEstadoRef = useRef<PropertyState>('activa');
  const initialEditableSnapshotRef = useRef<string>('');

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setSessionUser(null);
        setSessionRole(null);
        return;
      }
      setSessionRole(nextSession?.role ?? null);
      setSessionUser(
        (getStoredSessionUser() as UserData | null) || (nextSession.user as UserData | null)
      );
    });
    return unsubscribe;
  }, []);

  const resolvedRole = useMemo(
    () => resolveUserRole(sessionUser, sessionRole),
    [sessionRole, sessionUser]
  );
  const idArrendatario = useMemo(
    () => getLandlordId(sessionUser, sessionRole),
    [sessionRole, sessionUser]
  );
  const tenantId = useMemo(
    () => getTenantId(sessionUser, sessionRole),
    [sessionRole, sessionUser]
  );
  const canView = Boolean(
    sessionUser &&
      (resolvedRole === 'arrendatario' || hasValidId(sessionUser?.id_arrendatario)) &&
      hasValidId(idArrendatario)
  );
  const shouldRedirectToTenant = Boolean(
    authService.isAuthenticated() &&
      sessionUser &&
      resolvedRole === 'inquilino' &&
      !hasValidId(sessionUser?.id_arrendatario) &&
      hasValidId(tenantId)
  );

  useEffect(() => {
    if (shouldRedirectToTenant) {
      router.replace('/inquilino/profileInquilino' as any);
    }
  }, [router, shouldRedirectToTenant]);

  const showActionMessage = (type: 'success' | 'error', description: string, title?: string) => {
    setActionMessage({
      open: true,
      type,
      title: title || (type === 'success' ? 'Acción completada' : 'Error'),
      description,
    });
  };

  useEffect(() => {
    if (!canView || !idArrendatario || !id) return;

    let isMounted = true;

    async function loadProperty() {
      try {
        setIsLoading(true);
        setMessage('');
        const property = await getPropertyById(id, idArrendatario);
        if (!isMounted) return;

        const rawPriceType = String(property.tipo_precio || 'noche').trim().toLowerCase();
        const normalizedPriceType: PriceType =
          rawPriceType === 'mensual' ? 'mensual' : 'noche';
        const rawEstado = String(property.estado || 'activa').trim().toLowerCase();
        const normalizedEstado: PropertyState =
          rawEstado === 'inactiva' || rawEstado === 'suspendida' ? rawEstado : 'activa';

        const loadedForm: PropertyFormState = {
          titulo: property.titulo || '',
          descripcion: property.descripcion || '',
          direccion: property.direccion || '',
          ciudad: property.ciudad || '',
          pais: property.pais || '',
          tipo_precio: normalizedPriceType,
          precio_por_noche: property.precio_por_noche ? String(property.precio_por_noche) : '',
          capacidad: property.capacidad ? String(property.capacidad) : '',
          numero_habitaciones: property.numero_habitaciones !== null && property.numero_habitaciones !== undefined
            ? String(property.numero_habitaciones)
            : '',
          numero_banos: property.numero_banos !== null && property.numero_banos !== undefined
            ? String(property.numero_banos)
            : '',
          latitud: property.latitud !== null && property.latitud !== undefined ? String(property.latitud) : '',
          longitud: property.longitud !== null && property.longitud !== undefined ? String(property.longitud) : '',
          estado: normalizedEstado,
        };
        initialEstadoRef.current = normalizedEstado;
        initialEditableSnapshotRef.current = serializeEditableDetails(loadedForm);
        setForm(loadedForm);
        setCurrentImages(property.imagenes || []);
      } catch (error: unknown) {
        if (!isMounted) return;
        const msg = error instanceof Error ? error.message : 'No se pudo cargar la propiedad.';
        showActionMessage('error', msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProperty();

    return () => {
      isMounted = false;
    };
  }, [canView, idArrendatario, id]);

  const handleFieldChange = (name: keyof PropertyFormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setMessage('');
    setIsSuccess(false);
  };

  const handleLocationChange = (coordinates: { latitud: number | string; longitud: number | string }) => {
    setForm((current) => ({
      ...current,
      latitud: String(coordinates.latitud),
      longitud: String(coordinates.longitud),
    }));
    setErrors((current) => ({ ...current, latitud: '', longitud: '' }));
    setGeocodeState({ isLoading: false, type: '', message: '' });
    setMessage('');
    setIsSuccess(false);
  };

  const buildSearchAddress = (): string => {
    return [form.direccion, form.ciudad, form.pais]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(', ');
  };

  const handleSearchLocation = async () => {
    const address = buildSearchAddress();

    if (!address) {
      setGeocodeState({
        isLoading: false,
        type: 'error',
        message: 'Escribe una dirección para buscar la ubicación.',
      });
      return;
    }

    try {
      setGeocodeState({ isLoading: true, type: '', message: '' });
      const location = await geocodeAddress(address);
      setForm((current) => ({
        ...current,
        latitud: String(location.latitud),
        longitud: String(location.longitud),
      }));
      setErrors((current) => ({ ...current, latitud: '', longitud: '' }));
      setGeocodeState({
        isLoading: false,
        type: 'success',
        message: locationFoundMessage,
      });
      setIsSuccess(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      const isNotFound = errorMessage.toLowerCase().includes('no se encontro');
      setGeocodeState({
        isLoading: false,
        type: 'error',
        message: isNotFound ? locationNotFoundMessage : locationSearchFailedMessage,
      });
    }
  };

  const validateImageFiles = (nextFiles: ImagePicker.ImagePickerAsset[]): string => {
    const totalImages = currentImages.length + newImages.length + nextFiles.length;

    if (totalImages > 20) {
      return 'Solo puedes tener un maximo de 20 fotografias por propiedad.';
    }

    if (currentImages.length + newImages.length + nextFiles.length > 20) {
      return 'Solo puedes tener un maximo de 20 fotografias.';
    }

    const hasInvalidType = nextFiles.some(
      (file) => file.mimeType && !acceptedImageTypes.includes(file.mimeType)
    );
    if (hasInvalidType) {
      return 'Solo se permiten imagenes JPG, PNG o WEBP.';
    }

    const hasOversizedFile = nextFiles.some((file) => (file.fileSize || 0) > maxImageSize);
    if (hasOversizedFile) {
      return 'Cada imagen debe pesar máximo 5 MB.';
    }

    return '';
  };

  const validateReplacementFile = (file: ImagePicker.ImagePickerAsset | null | undefined): string => {
    if (!file) return 'Selecciona una imagen para reemplazar la fotografía.';
    if (file.mimeType && !acceptedImageTypes.includes(file.mimeType)) {
      return 'Solo se permiten imágenes JPG, PNG o WEBP.';
    }
    if ((file.fileSize || 0) > maxImageSize) {
      return 'Cada imagen debe pesar máximo 5 MB.';
    }
    return '';
  };

  const handleImagesChange = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrors((current) => ({
          ...current,
          imagenes: 'Se requiere permiso para acceder a la galería de fotos.',
        }));
        return;
      }

      const availableSlots = 20 - (currentImages.length + newImages.length);
      if (availableSlots <= 0) {
        setErrors((current) => ({
          ...current,
          imagenes: 'Solo puedes tener un máximo de 20 fotografías por propiedad.',
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: availableSlots,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const selectedFiles = result.assets;
      const imageError = validateImageFiles(selectedFiles);

      if (imageError) {
        setErrors((current) => ({ ...current, imagenes: imageError }));
        return;
      }

      const nextImages: NewPropertyImage[] = selectedFiles.map((file, index) => {
        imageSeqRef.current += 1;
        const seq = imageSeqRef.current;
        const fallbackName = `propiedad_${seq}_${index}.jpg`;
        return {
          id: `${file.fileName || fallbackName}-${seq}`,
          uri: file.uri,
          name: file.fileName || fallbackName,
          type: file.mimeType || 'image/jpeg',
          size: file.fileSize,
          previewUrl: file.uri,
          file: (file as ImagePicker.ImagePickerAsset & { file?: File }).file,
        };
      });

      setNewImages((current) => [...current, ...nextImages]);
      setErrors((current) => ({ ...current, imagenes: '' }));
      setMessage('');
      setIsSuccess(false);
    } catch {
      setErrors((current) => ({
        ...current,
        imagenes: 'No se pudieron cargar las fotos seleccionadas.',
      }));
    }
  };

  const removeNewImage = (imageId: string) => {
    setNewImages((current) => current.filter((image) => image.id !== imageId));
    setErrors((current) => ({ ...current, imagenes: '' }));
  };

  const handleDeleteCurrentImage = (image: PropertyImage) => {
    if (!id || !idArrendatario) return;
    if (currentImages.length <= 5) {
      setErrors((current) => ({
        ...current,
        imagenes: 'La propiedad debe conservar al menos 5 fotografías.',
      }));
      showActionMessage('error', 'La propiedad debe conservar al menos 5 fotografías.');
      setIsSuccess(false);
      return;
    }
    setConfirmAction({ open: true, type: 'delete', image, file: null });
  };

  const executeDeleteCurrentImage = async (image: PropertyImage | null) => {
    if (!image || !id || !idArrendatario) return;

    try {
      setDeletingImageId(image.id_imagen);
      setMessage('');
      setErrors((current) => ({ ...current, imagenes: '' }));
      const result = await deletePropertyImage(id, image.id_imagen, idArrendatario);
      setCurrentImages(
        result?.property?.imagenes ||
          result?.imagenes ||
          currentImages.filter((item) => item.id_imagen !== image.id_imagen),
      );
      setIsSuccess(true);
      notificarPropiedadActualizada({
        idPropiedad: id,
        idArrendatario,
        titulo: form.titulo.trim() || 'tu propiedad',
        estadoAnterior: form.estado,
        estadoNuevo: form.estado,
        huboCambioDeEstado: false,
        huboCambioDeDatos: true,
      });
      showActionMessage('success', 'Imagen eliminada correctamente.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo eliminar la imagen.';
      showActionMessage('error', msg);
      setIsSuccess(false);
    } finally {
      setDeletingImageId(null);
      setConfirmAction({ open: false, type: '', image: null, file: null });
    }
  };

  const handleReplacementFileChange = async (image: PropertyImage) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showActionMessage('error', 'Se requiere permiso para acceder a la galería de fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      const imageError = validateReplacementFile(file);

      if (imageError) {
        setErrors((current) => ({ ...current, imagenes: imageError }));
        showActionMessage('error', imageError);
        return;
      }

      setErrors((current) => ({ ...current, imagenes: '' }));

      imageSeqRef.current += 1;
      const seq = imageSeqRef.current;
      const replacementItem: NewPropertyImage = {
        id: `${file.fileName || 'replacement'}-${seq}`,
        uri: file.uri,
        name: file.fileName || `reemplazo_${seq}.jpg`,
        type: file.mimeType || 'image/jpeg',
        size: file.fileSize,
        previewUrl: file.uri,
        file: (file as ImagePicker.ImagePickerAsset & { file?: File }).file,
      };

      setConfirmAction({ open: true, type: 'replace', image, file: replacementItem });
    } catch {
      showActionMessage('error', 'No se pudo seleccionar la imagen de reemplazo.');
    }
  };

  const executeReplaceCurrentImage = async (
    image: PropertyImage | null,
    file: NewPropertyImage | null
  ) => {
    if (!image || !file || !id || !idArrendatario) return;

    const replacementFormData = new FormData();
    replacementFormData.append('id_arrendatario', String(idArrendatario));

    try {
      setReplacingImageId(image.id_imagen);
      setMessage('');
      await appendImageToFormData(replacementFormData, 'imagen', file);
      const result = await replacePropertyImage(id, image.id_imagen, replacementFormData);
      setCurrentImages(result?.property?.imagenes || result?.imagenes || currentImages);
      setIsSuccess(true);
      notificarPropiedadActualizada({
        idPropiedad: id,
        idArrendatario,
        titulo: form.titulo.trim() || 'tu propiedad',
        estadoAnterior: form.estado,
        estadoNuevo: form.estado,
        huboCambioDeEstado: false,
        huboCambioDeDatos: true,
      });
      showActionMessage('success', 'Imagen reemplazada correctamente.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo reemplazar la imagen.';
      showActionMessage('error', msg);
      setIsSuccess(false);
    } finally {
      setReplacingImageId(null);
      setConfirmAction({ open: false, type: '', image: null, file: null });
    }
  };

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.titulo.trim()) nextErrors.titulo = 'El título es obligatorio.';
    if (!form.descripcion.trim()) nextErrors.descripcion = 'La descripción es obligatoria.';
    if (!form.direccion.trim()) nextErrors.direccion = 'La dirección es obligatoria.';
    if (!form.ciudad.trim()) nextErrors.ciudad = 'La ciudad es obligatoria.';
    if (!form.pais.trim()) nextErrors.pais = 'El país es obligatorio.';

    if (!isValidOptionalCoordinate(form.latitud, -90, 90)) {
      nextErrors.latitud = 'La latitud debe estar entre -90 y 90.';
    }
    if (!isValidOptionalCoordinate(form.longitud, -180, 180)) {
      nextErrors.longitud = 'La longitud debe estar entre -180 y 180.';
    }
    if (!allowedPriceTypes.includes(form.tipo_precio)) {
      nextErrors.tipo_precio = 'El tipo de precio no es válido.';
    }
    if (Number(form.precio_por_noche) <= 0) {
      nextErrors.precio_por_noche =
        form.tipo_precio === 'mensual'
          ? 'El precio mensual debe ser mayor a 0.'
          : 'El precio por noche debe ser mayor a 0.';
    }
    if (form.capacidad !== '' && Number(form.capacidad) <= 0) {
      nextErrors.capacidad = 'La capacidad debe ser mayor a 0.';
    }
    if (
      form.numero_habitaciones !== '' &&
      (!Number.isInteger(Number(form.numero_habitaciones)) ||
        Number(form.numero_habitaciones) < 0)
    ) {
      nextErrors.numero_habitaciones = 'El número de habitaciones debe ser mayor o igual a 0.';
    }
    if (
      form.numero_banos !== '' &&
      (!Number.isInteger(Number(form.numero_banos)) ||
        Number(form.numero_banos) < 0)
    ) {
      nextErrors.numero_banos = 'El número de baños debe ser mayor o igual a 0.';
    }
    if (form.estado !== 'activa' && form.estado !== 'inactiva' && form.estado !== 'suspendida') {
      nextErrors.estado = 'El estado no es válido.';
    }
    if (form.estado === 'suspendida') {
      nextErrors.estado = 'El estado suspendida queda reservado para administración.';
    }
    if (!idArrendatario) {
      nextErrors.form = 'No se pudo identificar al arrendatario actual.';
    }
    if (currentImages.length + newImages.length > 20) {
      nextErrors.imagenes = 'Solo puedes tener un máximo de 20 fotografías por propiedad.';
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    setMessage('');
    setIsSuccess(false);

    if (!id) {
      showActionMessage('error', 'No se pudo identificar la propiedad a actualizar.');
      return;
    }

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    const propertyFormData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'capacidad' || key === 'numero_habitaciones' || key === 'numero_banos') {
        propertyFormData.append(key, normalizeOptionalNumber(value));
        return;
      }

      propertyFormData.append(key, value);
    });
    propertyFormData.append('id_arrendatario', String(idArrendatario));

    try {
      setIsSubmitting(true);
      for (const image of newImages) {
        await appendImageToFormData(propertyFormData, 'imagenes', image);
      }
      const result = await updateProperty(id, propertyFormData);
      const estadoAnterior = initialEstadoRef.current;
      const estadoNuevo = form.estado;
      const huboCambioDeEstado = estadoAnterior !== estadoNuevo;
      const huboCambioDeDatos =
        initialEditableSnapshotRef.current !== serializeEditableDetails(form) ||
        newImages.length > 0;

      notificarPropiedadActualizada({
        idPropiedad: id,
        idArrendatario,
        titulo: form.titulo.trim() || result?.property?.titulo || 'tu propiedad',
        estadoAnterior,
        estadoNuevo,
        huboCambioDeEstado,
        huboCambioDeDatos,
      });

      initialEstadoRef.current = estadoNuevo;
      initialEditableSnapshotRef.current = serializeEditableDetails(form);

      setNewImages([]);
      setCurrentImages(result?.property?.imagenes || result?.imagenes || currentImages);
      setIsSuccess(true);
      showActionMessage(
        'success',
        newImages.length > 0 ? 'Imágenes agregadas correctamente.' : 'Propiedad actualizada correctamente.'
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudo actualizar la propiedad.';
      showActionMessage('error', msg);
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: string) => {
    if (!errors[field]) return null;
    return (
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <AlertCircle size={14} color="#DC2626" />
        <Text className="flex-1 font-inter text-xs text-red-700">{errors[field]}</Text>
      </View>
    );
  };

  const priceLabel = form.tipo_precio === 'mensual' ? 'Precio mensual' : 'Precio por noche';
  const isDeleteAction = confirmAction.type === 'delete';
  const actionImageLabel = confirmAction.image?.es_principal
    ? 'la imagen principal'
    : 'esta imagen';

  if (!authService.isAuthenticated() || shouldRedirectToTenant) return null;

  if (!canView) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
        <StatusBar style="dark" />
        <HeaderArrendatario />
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-full max-w-md rounded-2xl bg-white border border-[#DCDCDC] p-6 items-center shadow-sm">
            <AlertCircle size={36} color="#DC2626" />
            <Text className="mt-3 font-poppins text-lg font-semibold text-[#1C1C1C] text-center">
              No se pudo validar tu cuenta de arrendatario
            </Text>
            <Text className="mt-2 font-inter text-sm text-[#595959] text-center leading-5">
              Vuelve a tu perfil o inicia sesión nuevamente para editar propiedades.
            </Text>
            <View className="mt-5 w-full flex-col gap-3">
              <TouchableOpacity
                onPress={() => router.replace('/arrendatario/profileArrendatario' as any)}
                className="min-h-[48px] justify-center w-full rounded-xl bg-[#B8860B] py-3 items-center"
              >
                <Text className="font-inter-medium text-white">Volver al perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  authService.logout();
                  router.replace('/loginPage' as any);
                }}
                className="min-h-[48px] justify-center w-full rounded-xl border-[1.5px] border-[#B8860B] py-3 items-center"
              >
                <Text className="font-inter-medium text-[#B8860B]">Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
        <StatusBar style="dark" />
        <HeaderArrendatario />
        <View className="flex-1 px-4 py-8 justify-center items-center">
          <View className="w-full max-w-md rounded-2xl border border-[#DCDCDC] bg-[#F5F2EC] p-6 items-center">
            <Text className="font-poppins text-lg font-semibold text-[#1C1C1C] mb-2 text-center">
              Propiedad no especificada
            </Text>
            <Text className="font-inter text-sm text-[#595959] mb-5 text-center">
              Selecciona una propiedad desde tu listado para poder editarla.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/arrendatario/MisPropiedades' as any)}
              className="min-h-[48px] justify-center rounded-xl bg-[#B8860B] px-5 py-3"
            >
              <Text className="font-inter-medium text-white">Ir a mis propiedades</Text>
            </TouchableOpacity>
          </View>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <StatusBar style="dark" />
      <HeaderArrendatario />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1 px-4 py-8" keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-5xl mx-auto">
          {/* Volver a mis propiedades */}
          <TouchableOpacity
            onPress={() => router.push('/arrendatario/MisPropiedades' as any)}
            className="mb-5 min-h-[44px] flex-row items-center self-start rounded-xl px-3.5 py-2 bg-white border border-[#DCDCDC]"
          >
            <ArrowLeft size={16} color="#B87333" />
            <Text className="font-inter-medium text-[#1C1C1C] ml-2">Volver a mis propiedades</Text>
          </TouchableOpacity>

          {/* Tarjeta Principal */}
          <View className="bg-white border border-[#DCDCDC] rounded-2xl p-6 shadow-sm">
            <View className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F2EC] border border-[#DCDCDC]">
              <Pencil size={24} color="#B8860B" />
            </View>
            <Text className="font-poppins text-2xl font-semibold text-[#1C1C1C]">
              Editar propiedad
            </Text>
            <Text className="mt-2 font-inter text-sm text-[#595959]">
              Actualiza la información de tu alojamiento publicado en NoWayHome.
            </Text>

            {isLoading ? (
              <View className="mt-8 flex-row items-center">
                <ActivityIndicator color="#B8860B" size="small" />
                <Text className="ml-3 font-inter text-[#1C1C1C]">Cargando propiedad...</Text>
              </View>
            ) : (
              <View className="mt-8">
                {/* SECCIÓN: Información básica */}
                <View className="mb-8">
                  <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-4">
                    Información básica
                  </Text>
                  <View className="space-y-4">
                    <View className="mb-4">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Título</Text>
                      <TextInput
                        value={form.titulo}
                        onChangeText={(val) => handleFieldChange('titulo', val)}
                        placeholder="Título de la propiedad"
                        placeholderTextColor="#7A7A7A"
                        className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                      />
                      {renderError('titulo')}
                    </View>

                    <View className="mb-4">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Descripción</Text>
                      <TextInput
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={form.descripcion}
                        onChangeText={(val) => handleFieldChange('descripcion', val)}
                        placeholder="Descripción completa"
                        placeholderTextColor="#7A7A7A"
                        className="min-h-[128px] bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter text-[#1C1C1C] p-4 rounded-xl"
                      />
                      {renderError('descripcion')}
                    </View>
                  </View>
                </View>

                {/* SECCIÓN: Ubicación */}
                <View className="mb-8">
                  <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-4">
                    Ubicación
                  </Text>
                  <View className="space-y-4">
                    <View className="mb-4">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Dirección</Text>
                      <TextInput
                        value={form.direccion}
                        onChangeText={(val) => handleFieldChange('direccion', val)}
                        placeholder="Dirección completa"
                        placeholderTextColor="#7A7A7A"
                        className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                      />
                      {renderError('direccion')}
                    </View>

                    <View className="flex-row gap-3 mb-4">
                      <View className="flex-1">
                        <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Ciudad</Text>
                        <TextInput
                          value={form.ciudad}
                          onChangeText={(val) => handleFieldChange('ciudad', val)}
                          placeholder="Ciudad"
                          placeholderTextColor="#7A7A7A"
                          className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                        />
                        {renderError('ciudad')}
                      </View>
                      <View className="flex-1">
                        <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">País</Text>
                        <TextInput
                          value={form.pais}
                          onChangeText={(val) => handleFieldChange('pais', val)}
                          placeholder="País"
                          placeholderTextColor="#7A7A7A"
                          className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                        />
                        {renderError('pais')}
                      </View>
                    </View>

                    <View className="mb-4">
                      <TouchableOpacity
                        onPress={handleSearchLocation}
                        disabled={geocodeState.isLoading}
                        className={`min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#B8860B] px-4 ${
                          geocodeState.isLoading ? 'opacity-60' : 'active:bg-[#9A6F09]'
                        }`}
                      >
                        {geocodeState.isLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Search size={16} color="#fff" />
                            <Text className="ml-2 font-inter-medium text-white">Buscar ubicación</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {geocodeState.message ? (
                        <View
                          className={`mt-3 p-3 rounded-xl flex-row items-center border ${
                            geocodeState.type === 'success'
                              ? 'bg-[#F5F2EC] border-[#B8860B]/35'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          {geocodeState.type === 'success' ? (
                            <CheckCircle2 size={16} color="#B8860B" />
                          ) : (
                            <AlertCircle size={16} color="#DC2626" />
                          )}
                          <Text
                            className={`ml-2 font-inter text-xs flex-1 ${
                              geocodeState.type === 'success' ? 'text-[#1C1C1C]' : 'text-red-800'
                            }`}
                          >
                            {geocodeState.message}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View className="mb-4">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Mapa de ubicación</Text>
                      <PropertyLocationMap
                        editable
                        latitud={form.latitud}
                        longitud={form.longitud}
                        direccion={buildSearchAddress() || undefined}
                        onChange={handleLocationChange}
                        className="mt-2"
                      />
                    </View>

                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Latitud</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={form.latitud}
                          onChangeText={(val) => handleFieldChange('latitud', val)}
                          placeholder="0.000000"
                          placeholderTextColor="#7A7A7A"
                          className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                        />
                        {renderError('latitud')}
                      </View>
                      <View className="flex-1">
                        <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Longitud</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={form.longitud}
                          onChangeText={(val) => handleFieldChange('longitud', val)}
                          placeholder="0.000000"
                          placeholderTextColor="#7A7A7A"
                          className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                        />
                        {renderError('longitud')}
                      </View>
                    </View>
                  </View>
                </View>

                {/* SECCIÓN: Capacidad y precio */}
                <View className="mb-8">
                  <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-4">
                    Capacidad y precio
                  </Text>

                  {/* Selector: Tipo de precio */}
                  <View className="mb-4">
                    <Text className="font-inter-medium text-[#1C1C1C] mb-2">Tipo de precio</Text>
                    <View className="flex-row bg-[#FAFAFA] p-1 rounded-xl border border-[#DCDCDC]">
                      <TouchableOpacity
                        onPress={() => handleFieldChange('tipo_precio', 'noche')}
                        className={`min-h-[44px] justify-center flex-1 py-2.5 rounded-lg items-center ${
                          form.tipo_precio === 'noche' ? 'bg-[#B8860B]' : 'bg-transparent'
                        }`}
                      >
                        <Text
                          className={`font-inter-medium ${
                            form.tipo_precio === 'noche' ? 'text-white' : 'text-[#1C1C1C]'
                          }`}
                        >
                          Por noche
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleFieldChange('tipo_precio', 'mensual')}
                        className={`min-h-[44px] justify-center flex-1 py-2.5 rounded-lg items-center ${
                          form.tipo_precio === 'mensual' ? 'bg-[#B8860B]' : 'bg-transparent'
                        }`}
                      >
                        <Text
                          className={`font-inter-medium ${
                            form.tipo_precio === 'mensual' ? 'text-white' : 'text-[#1C1C1C]'
                          }`}
                        >
                          Mensual
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {renderError('tipo_precio')}
                  </View>

                  <View className="mb-4">
                    <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">{priceLabel}</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={form.precio_por_noche}
                      onChangeText={(val) => handleFieldChange('precio_por_noche', val)}
                      placeholder="0.00"
                      placeholderTextColor="#7A7A7A"
                      className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                    />
                    {renderError('precio_por_noche')}
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Capacidad</Text>
                      <TextInput
                        keyboardType="number-pad"
                        value={form.capacidad}
                        onChangeText={(val) => handleFieldChange('capacidad', val)}
                        placeholder="Ej. 4"
                        placeholderTextColor="#7A7A7A"
                        className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                      />
                      {renderError('capacidad')}
                    </View>
                    <View className="flex-1">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Habitaciones</Text>
                      <TextInput
                        keyboardType="number-pad"
                        value={form.numero_habitaciones}
                        onChangeText={(val) => handleFieldChange('numero_habitaciones', val)}
                        placeholder="Ej. 2"
                        placeholderTextColor="#7A7A7A"
                        className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                      />
                      {renderError('numero_habitaciones')}
                    </View>
                    <View className="flex-1">
                      <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">Baños</Text>
                      <TextInput
                        keyboardType="number-pad"
                        value={form.numero_banos}
                        onChangeText={(val) => handleFieldChange('numero_banos', val)}
                        placeholder="Ej. 1"
                        placeholderTextColor="#7A7A7A"
                        className="h-12 bg-[#FAFAFA] border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] px-4 rounded-xl"
                      />
                      {renderError('numero_banos')}
                    </View>
                  </View>
                </View>

                {/* SECCIÓN: Estado */}
                <View className="mb-8">
                  <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-4">Estado</Text>
                  <View>
                    <Text className="font-inter-medium text-[#1C1C1C] mb-2">Estado de publicación</Text>
                    <View className="flex-row bg-[#FAFAFA] p-1 rounded-xl border border-[#DCDCDC]">
                      <TouchableOpacity
                        onPress={() => handleFieldChange('estado', 'activa')}
                        disabled={form.estado === 'suspendida'}
                        className={`min-h-[44px] justify-center flex-1 py-2.5 rounded-lg items-center ${
                          form.estado === 'activa' ? 'bg-[#B8860B]' : 'bg-transparent'
                        } ${form.estado === 'suspendida' ? 'opacity-50' : ''}`}
                      >
                        <Text
                          className={`font-inter-medium ${
                            form.estado === 'activa' ? 'text-white' : 'text-[#1C1C1C]'
                          }`}
                        >
                          Activa
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleFieldChange('estado', 'inactiva')}
                        disabled={form.estado === 'suspendida'}
                        className={`min-h-[44px] justify-center flex-1 py-2.5 rounded-lg items-center ${
                          form.estado === 'inactiva' ? 'bg-[#B8860B]' : 'bg-transparent'
                        } ${form.estado === 'suspendida' ? 'opacity-50' : ''}`}
                      >
                        <Text
                          className={`font-inter-medium ${
                            form.estado === 'inactiva' ? 'text-white' : 'text-[#1C1C1C]'
                          }`}
                        >
                          Inactiva
                        </Text>
                      </TouchableOpacity>

                      {form.estado === 'suspendida' && (
                        <View className="flex-1 py-2.5 rounded-lg items-center bg-[#B87333]">
                          <Text className="font-inter-medium text-white">Suspendida</Text>
                        </View>
                      )}
                    </View>
                    {renderError('estado')}
                  </View>
                </View>

                {/* SECCIÓN: Imágenes actuales */}
                <View className="mb-8">
                  <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-4">
                    Imágenes actuales
                  </Text>
                  {currentImages.length > 0 ? (
                    <View className="flex-row flex-wrap gap-3">
                      {currentImages.map((image) => (
                        <View
                          key={String(image.id_imagen || image.url)}
                          className="relative rounded-xl overflow-hidden bg-white border border-[#DCDCDC]"
                          style={{ width: '48%', minHeight: 180 }}
                        >
                          <Image
                            source={{ uri: resolveImageUrl(image.url) }}
                            className="h-32 w-full"
                            resizeMode="cover"
                          />

                          {image.es_principal && (
                            <View className="absolute left-2 top-2 rounded-lg bg-[#B8860B] px-2 py-1">
                              <Text className="font-inter-medium text-xs text-white">Principal</Text>
                            </View>
                          )}

                          <View className="p-2 flex-col gap-2 bg-white">
                            <TouchableOpacity
                              onPress={() => handleReplacementFileChange(image)}
                              disabled={replacingImageId === image.id_imagen}
                              className="min-h-[38px] rounded-lg bg-[#F5F2EC] py-1.5 items-center justify-center border border-[#DCDCDC]"
                            >
                              <Text className="font-inter-medium text-xs text-[#B8860B]">
                                {replacingImageId === image.id_imagen
                                  ? 'Reemplazando...'
                                  : 'Reemplazar'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDeleteCurrentImage(image)}
                              disabled={deletingImageId === image.id_imagen}
                              className="min-h-[38px] flex-row items-center justify-center rounded-lg bg-red-50 py-1.5 border border-red-200"
                            >
                              <Trash2 size={12} color="#DC2626" />
                              <Text className="ml-1 font-inter-medium text-xs text-red-700">
                                {deletingImageId === image.id_imagen ? 'Eliminando...' : 'Eliminar'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="font-inter text-sm text-[#595959]">
                      Esta propiedad no tiene imágenes.
                    </Text>
                  )}
                </View>

                {/* SECCIÓN: Agregar nuevas imágenes */}
                <View className="mb-8">
                  <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-1 mr-2">
                      <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">
                        Agregar nuevas imágenes
                      </Text>
                      <Text className="mt-1 font-inter text-sm text-[#595959]">
                        Puedes tener entre 5 y 20 fotografías por propiedad.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleImagesChange}
                      className="min-h-[44px] flex-row items-center rounded-xl bg-white px-4 py-3 border-[1.5px] border-[#B8860B]"
                    >
                      <ImagePlus size={16} color="#B8860B" />
                      <Text className="ml-2 font-inter-medium text-[#B8860B]">Seleccionar fotos</Text>
                    </TouchableOpacity>
                  </View>

                  {renderError('imagenes')}

                  {newImages.length > 0 && (
                    <View className="flex-row flex-wrap gap-3 mt-4">
                      {newImages.map((image) => (
                        <View
                          key={image.id}
                          className="relative rounded-xl overflow-hidden bg-white border border-[#DCDCDC]"
                          style={{ width: '48%', height: 130 }}
                        >
                          <Image
                            source={{ uri: image.previewUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => removeNewImage(image.id)}
                            accessibilityLabel="Quitar imagen"
                            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-lg bg-white border border-[#DCDCDC] shadow-sm"
                          >
                            <Trash2 size={16} color="#B87333" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Error global */}
                {errors.form && (
                  <View className="rounded-xl bg-red-50 p-4 mb-4 border border-red-200 flex-row items-center gap-2">
                    <AlertCircle size={16} color="#DC2626" />
                    <Text className="font-inter text-sm text-red-800 flex-1">{errors.form}</Text>
                  </View>
                )}

                {/* Botones de acción */}
                <View className="flex-col gap-3 mt-4">
                  {isSuccess && (
                    <TouchableOpacity
                      onPress={() => router.push('/arrendatario/MisPropiedades' as any)}
                      className="min-h-[48px] border-[1.5px] border-[#B8860B] rounded-xl items-center justify-center bg-white"
                    >
                      <Text className="font-inter-medium text-[#B8860B]">Volver a mis propiedades</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    className={`min-h-[48px] bg-[#B8860B] rounded-xl items-center justify-center ${
                      isSubmitting ? 'opacity-60' : 'active:bg-[#9A6F09]'
                    }`}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="font-inter-medium text-white text-base">Guardar cambios</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <BottomTabBar />

      {/* Modal Confirmación: Eliminar o Reemplazar Imagen */}
      <ConfirmActionModal
        open={confirmAction.open}
        title={isDeleteAction ? 'Eliminar imagen' : 'Reemplazar imagen'}
        description={
          isDeleteAction ? (
            <Text className="text-sm leading-5 text-[#555555]">
              ¿Seguro quieres eliminar {actionImageLabel}? Esta acción también borrará el archivo del
              almacenamiento. La propiedad debe conservar al menos 5 fotografías.
            </Text>
          ) : (
            <Text className="text-sm leading-5 text-[#555555]">
              ¿Seguro quieres reemplazar {actionImageLabel}? Se mantendrá el mismo orden en la galería.
            </Text>
          )
        }
        cancelLabel="Cancelar"
        confirmLabel={
          isDeleteAction
            ? deletingImageId
              ? 'Eliminando...'
              : 'Eliminar'
            : replacingImageId
              ? 'Reemplazando...'
              : 'Reemplazar'
        }
        confirmVariant={isDeleteAction ? 'adminDanger' : 'adminPrimary'}
        disableCancel={Boolean(deletingImageId || replacingImageId)}
        disableConfirm={Boolean(deletingImageId || replacingImageId)}
        onCancel={() => setConfirmAction({ open: false, type: '', image: null, file: null })}
        onConfirm={() => {
          if (confirmAction.type === 'delete') {
            executeDeleteCurrentImage(confirmAction.image);
            return;
          }
          executeReplaceCurrentImage(confirmAction.image, confirmAction.file);
        }}
      />

      {/* Modal Mensaje de Acción */}
      <ConfirmActionModal
        open={actionMessage.open}
        type={actionMessage.type}
        title={actionMessage.title}
        description={actionMessage.description}
        confirmLabel="Entendido"
        onConfirm={() => setActionMessage({ open: false, type: '', title: '', description: '' })}
      />
    </SafeAreaView>
  );
}

export default EditarPropiedad;