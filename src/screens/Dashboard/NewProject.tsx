import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from "../Contexts/ThemeContext";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Animated,
  Easing,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ms, s, vs } from 'react-native-size-matters'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProject } from '../Contexts/projectContext'
import * as ImagePicker from 'expo-image-picker' // ADDED
// ─── Palette ────────────────────────────────────────────────────────────────
let C = {
  bg: '#111111',
  surface: '#1A1A1A',
  card: '#1E1E1E',
  accent: '#F5C518',
  accentBg: '#2A2200',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  inputBorder: '#2A2A2A',
  errorRed: '#FF4D4D',
  selectedBorder: '#F5C518',
  selectedBg: '#1E1A00',
  divider: '#2A2A2A',
}
// ─── Types ───────────────────────────────────────────────────────────────────
type Visibility = 'Private' | 'Team' | 'Public'
type VisibilityOption = {
  value: Visibility
  label: string
  sub: string
  icon: keyof typeof Ionicons.glyphMap
}
// ─── Visibility Options ──────────────────────────────────────────────────────
const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'Private', label: 'Private', sub: 'Only invited members',  icon: 'lock-closed-outline' },
  { value: 'Team',    label: 'Team',    sub: 'Anyone in your team',   icon: 'people-outline'      },
  { value: 'Public',  label: 'Public',  sub: 'Anyone with the link',  icon: 'globe-outline'       },
]
const NAME_MAX = 30
// ─── Main Screen ─────────────────────────────────────────────────────────────
const NewProjectScreen: React.FC = () => {
  const { colors, isDark } = useTheme()
  C = {
    ...C,
    bg: colors.background,
    surface: colors.surface,
    card: colors.card,
    accent: colors.accent,
    accentBg: isDark ? '#2A2200' : '#FFF8E0',
    textPrimary: colors.text,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
    inputBorder: colors.border,
    errorRed: colors.danger,
    selectedBorder: colors.accent,
    selectedBg: isDark ? '#1E1A00' : '#FFF8E0',
    divider: colors.border,
  }
  styles = makeStyles()
  const navigation = useNavigation<any>()
  const { createProject, error: contextError } = useProject()
  const [projectName, setProjectName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [visibility, setVisibility]   = useState<Visibility>('Team')
  const [creating, setCreating]       = useState<boolean>(false)
  const [nameError, setNameError]     = useState<string>('')
  const [descError, setDescError]     = useState<string>('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [nameFocused, setNameFocused] = useState(false)
  const [createDone, setCreateDone] = useState(false)

  const enterY = useRef(new Animated.Value(28)).current
  const enterOp = useRef(new Animated.Value(0)).current
  const coverBreath = useRef(new Animated.Value(1)).current
  const coverFade = useRef(new Animated.Value(0)).current
  const focusBorder = useRef(new Animated.Value(0)).current
  const createScale = useRef(new Animated.Value(1)).current
  const visScales = useRef(
    VISIBILITY_OPTIONS.map((opt) => new Animated.Value(opt.value === 'Team' ? 1.06 : 1))
  ).current

  useEffect(() => {
    VISIBILITY_OPTIONS.forEach((opt, i) => {
      Animated.spring(visScales[i], {
        toValue: visibility === opt.value ? 1.06 : 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }).start()
    })
  }, [visibility])

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterOp, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()

    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(coverBreath, {
          toValue: 1.06,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(coverBreath, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    breath.start()
    return () => breath.stop()
  }, [])

  useEffect(() => {
    if (!thumbnailUrl) {
      coverFade.setValue(0)
      return
    }
    coverFade.setValue(0)
    Animated.timing(coverFade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [thumbnailUrl])

  useEffect(() => {
    Animated.timing(focusBorder, {
      toValue: nameFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }, [nameFocused])

  // ── Validation ──
  const validate = (): boolean => {
    let valid = true
    if (projectName.trim().length === 0) {
      setNameError('Project name is required.')
      valid = false
    } else if (projectName.trim().length < 3) {
      setNameError('Name must be at least 3 characters.')
      valid = false
    } else {
      setNameError('')
    }
    if (description.trim().length === 0) {
      setDescError('Please add a short description.')
      valid = false
    } else if (description.trim().length < 10) {
      setDescError('Description must be at least 10 characters.')
      valid = false
    } else {
      setDescError('')
    }
    return valid
  }
  //  opens image picker, sets thumbnailUrl on success ──
  const pickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    })
    if (!result.canceled) {
      setThumbnailUrl(result.assets[0].uri)
    }
  }
  // ── Submit ──
  const handleCreate = async () => {
    if (!validate()) return
    try {
      setCreating(true)
      await createProject(
        projectName.trim(),
        description.trim(),
        visibility,
        thumbnailUrl ?? undefined
      )
      setCreateDone(true)
      Animated.sequence([
        Animated.spring(createScale, {
          toValue: 1.04,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(createScale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.navigate('projectdetail')
      })
    } catch (e: any) {
      Alert.alert(
        'Couldn’t create project',
        e?.message || contextError || 'Check that the backend is running and try again.'
      )
      setCreating(false)
      setCreateDone(false)
    }
  }
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
          {/* ── Top Bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.topBarIcon}
              disabled={creating}
            >
              <Ionicons name="close" size={ms(22)} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>New project</Text>
            <TouchableOpacity onPress={handleCreate} disabled={creating}>
              <Text style={[styles.topBarCreate, { opacity: creating ? 0.4 : 1 }]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <Animated.View
            style={{
              flex: 1,
              opacity: enterOp,
              transform: [{ translateY: enterY }],
            }}
          >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Context error ── */}
            {contextError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={ms(13)} color={C.errorRed} />
                <Text style={styles.errorText}>{contextError}</Text>
              </View>
            ) : null}
            {/* ── Cover Image ── */}
            <TouchableOpacity style={styles.coverBox} activeOpacity={0.8} onPress={pickCoverImage} disabled={creating}>
              {thumbnailUrl ? (
                <Animated.Image
                  source={{ uri: thumbnailUrl }}
                  style={[
                    styles.coverImage,
                    {
                      opacity: coverFade,
                      transform: [
                        {
                          scale: coverFade.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1.04, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ) : (
                <>
                  <Animated.View
                    style={[
                      styles.coverIconCircle,
                      { transform: [{ scale: coverBreath }] },
                    ]}
                  >
                    <Ionicons name="image-outline" size={ms(26)} color={C.accent} />
                  </Animated.View>
                  <Text style={styles.coverLabel}>Add cover image</Text>
                </>
              )}
            </TouchableOpacity>
            {/* ── Project Name ── */}
            <Text style={styles.fieldLabel}>PROJECT NAME</Text>
            <Animated.View
              style={[
                styles.inputBox,
                nameError ? styles.inputBoxError : null,
                {
                  borderColor: nameError
                    ? C.errorRed
                    : focusBorder.interpolate({
                        inputRange: [0, 1],
                        outputRange: [C.inputBorder, C.accent],
                      }),
                },
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="e.g. Summer campaign 2026"
                placeholderTextColor={C.textMuted}
                value={projectName}
                onChangeText={(t) => {
                  if (t.length <= NAME_MAX) setProjectName(t)
                  if (nameError) setNameError('')
                }}
                maxLength={NAME_MAX}
                editable={!creating}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
              <Text style={styles.charCount}>{NAME_MAX - projectName.length}</Text>
            </Animated.View>
            {nameError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={ms(13)} color={C.errorRed} />
                <Text style={styles.errorText}>{nameError}</Text>
              </View>
            ) : null}
            {/* ── Description ── */}
            <Text style={[styles.fieldLabel, { marginTop: vs(18) }]}>DESCRIPTION</Text>
            <View style={[styles.inputBox, styles.textAreaBox, descError ? styles.inputBoxError : null]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={'A collaborative summer video series\nfeaturing product highlights and BTS'}
                placeholderTextColor={C.textMuted}
                value={description}
                onChangeText={(t) => {
                  setDescription(t)
                  if (descError) setDescError('')
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!creating}
              />
            </View>
            {descError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={ms(13)} color={C.errorRed} />
                <Text style={styles.errorText}>{descError}</Text>
              </View>
            ) : null}
            {/* ── Visibility ── */}
            <Text style={[styles.fieldLabel, { marginTop: vs(18) }]}>VISIBILITY</Text>
            {VISIBILITY_OPTIONS.map((opt, index) => {
              const isSelected = visibility === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.visibilityCard, isSelected && styles.visibilityCardSelected]}
                  onPress={() => setVisibility(opt.value)}
                  activeOpacity={0.8}
                  disabled={creating}
                >
                  <Animated.View
                    style={[
                      styles.visibilityIconBox,
                      isSelected && styles.visibilityIconBoxSelected,
                      { transform: [{ scale: visScales[index] }] },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={ms(18)}
                      color={isSelected ? C.accent : C.textSecondary}
                    />
                  </Animated.View>
                  <View style={styles.visibilityText}>
                    <Text style={[styles.visibilityLabel, isSelected && { color: C.accent }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.visibilitySub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={ms(12)} color={C.bg} />}
                  </View>
                </TouchableOpacity>
              )
            })}
            {/* ── Create Button ── */}
            <Animated.View style={{ transform: [{ scale: createScale }] }}>
              <TouchableOpacity
                style={[styles.createBtn, creating && styles.createBtnLoading]}
                onPress={handleCreate}
                activeOpacity={0.85}
                disabled={creating}
              >
                {createDone ? (
                  <View style={styles.createBtnInner}>
                    <Ionicons name="checkmark-circle" size={ms(20)} color="#000000" style={{ marginRight: s(6) }} />
                    <Text style={styles.createBtnText}>Created</Text>
                  </View>
                ) : creating ? (
                  <View style={styles.createBtnInner}>
                    <ActivityIndicator size="small" color="#000000" style={{ marginRight: s(8) }} />
                    <Text style={styles.createBtnText}>Creating...</Text>
                  </View>
                ) : (
                  <View style={styles.createBtnInner}>
                    <Ionicons name="add" size={ms(20)} color="#000000" style={{ marginRight: s(4) }} />
                    <Text style={styles.createBtnText}>Create project</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
            <View style={{ height: vs(32) }} />
          </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
export default NewProjectScreen
// ─── Styles ─────────────────
function makeStyles() {
  return StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingBottom:s(40),
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(18),
    paddingTop: vs(16),
    paddingBottom: vs(14),
  },
  topBarIcon: {
    width: ms(32),
    alignItems: 'flex-start',
  },
  topBarTitle: {
    color: C.textPrimary,
    fontSize: ms(17),
    fontWeight: '700',
  },
  topBarCreate: {
    color: C.accent,
    fontSize: ms(15),
    fontWeight: '700',
  },
  coverImage:{
  width:'100%',
  height:'100%',
  borderRadius:12,
  },
  divider: {
    height: 1,
    backgroundColor: C.divider,
  },
  // Scroll
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: vs(20),
  },
  // Cover
  coverBox: {
    width: '100%',
    height: vs(120),
    backgroundColor: C.surface,
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(10),
    marginBottom: vs(22),
  },
  coverIconCircle: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLabel: {
    color: C.textSecondary,
    fontSize: ms(13),
  },
  // Field label
  fieldLabel: {
    color: C.textSecondary,
    fontSize: ms(11),
    fontWeight: '600',
    letterSpacing: 1.1,
    marginBottom: vs(8),
  },
  // Input
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: ms(12),
    paddingHorizontal: s(14),
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  inputBoxError: {
    borderColor: C.errorRed,
  },
  input: {
    flex: 1,
    color: C.textPrimary,
    fontSize: ms(14),
  },
  charCount: {
    color: C.textMuted,
    fontSize: ms(12),
    marginLeft: s(8),
  },
  // Text area
  textAreaBox: {
    alignItems: 'flex-start',
    paddingVertical: vs(12),
  },
  textArea: {
    minHeight: vs(50),
    lineHeight: ms(20),
  },
  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    marginTop: vs(5),
  },
  errorText: {
    color: C.errorRed,
    fontSize: ms(11),
  },
  // Visibility
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: ms(12),
    paddingHorizontal: s(14),
    paddingVertical: vs(12),
    borderWidth: 1,
    borderColor: C.inputBorder,
    marginBottom: vs(10),
    gap: s(12),
  },
  visibilityCardSelected: {
    borderColor: C.selectedBorder,
    backgroundColor: C.selectedBg,
  },
  visibilityIconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityIconBoxSelected: {
    backgroundColor: C.accentBg,
  },
  visibilityText: {
    flex: 1,
    gap: vs(2),
  },
  visibilityLabel: {
    color: C.textPrimary,
    fontSize: ms(14),
    fontWeight: '700',
  },
  visibilitySub: {
    color: C.textSecondary,
    fontSize: ms(11),
  },
  radio: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: 1.5,
    borderColor: C.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  // Create button
  createBtn: {
    width: '100%',
    backgroundColor: C.accent,
    borderRadius: ms(14),
    paddingVertical: vs(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(24),
  },
  createBtnLoading: {
    opacity: 0.85,
  },
  createBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#000000',
    fontSize: ms(15),
    fontWeight: '700',
  },
});
}
let styles = makeStyles()

