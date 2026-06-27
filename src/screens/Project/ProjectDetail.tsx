import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { Ionicons } from '@expo/vector-icons';
// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'Clips' | 'Members' | 'Comments' | 'Settings';
interface Clip {
  id: string;
  title: string;
  duration: string;
  resolution: string;
  date: string;
}
interface Member {
  id: string;
  name: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  initials: string;
  color: string;
  online: boolean;
}
interface Comment {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  timestamp: string;
  clip: string;
}
// ─── Mock Data ────────────────────────────────────────────────────────────────
const CLIPS: Clip[] = [
  { id: '1', title: 'Intro clip', duration: '00:18', resolution: '1080p', date: 'Jun 12, 2026' },
  { id: '2', title: 'Main segment', duration: '00:42', resolution: '4K', date: 'Jun 11, 2026' },
  { id: '3', title: 'Outro', duration: '00:12', resolution: '1080p', date: 'Jun 10, 2026' },
  { id: '4', title: 'B-Roll montage', duration: '01:05', resolution: '1080p', date: 'Jun 9, 2026' },
];
const MEMBERS: Member[] = [
  { id: '1', name: 'Caleboss', role: 'Owner', initials: 'CD', color: '#F5C518', online: true },
  { id: '2', name: 'Jesse Sarfo', role: 'Editor', initials: 'JS', color: '#4CAF50', online: true },
  { id: '3', name: 'Ama Owusu', role: 'Editor', initials: 'AO', color: '#E91E63', online: false },
  { id: '4', name: 'Dave', role: 'Viewer', initials: 'KM', color: '#2196F3', online: false },
];
const COMMENTS: Comment[] = [
  { id: '1', author: 'Jesse Sarfo', initials: 'JS', color: '#4CAF50', text: 'The transition at 0:14 feels abrupt, can we smooth it out?', timestamp: '2h ago', clip: 'Intro clip' },
  { id: '2', author: 'Ama Owusu', initials: 'AO', color: '#E91E63', text: 'Color grading on the main segment looks great! 🔥', timestamp: '5h ago', clip: 'Main segment' },
  { id: '3', author: 'Kofi Mensah', initials: 'KM', color: '#2196F3', text: 'Should the outro have the logo watermark?', timestamp: '1d ago', clip: 'Outro' },
  { id: '4', author: 'Caleb Dwamena', initials: 'CD', color: '#F5C518', text: 'Final render is scheduled for Friday.', timestamp: '2d ago', clip: 'General' },
];
const ROLE_COLORS: Record<string, string> = {
  Owner: '#F5C518',
  Editor: '#4CAF50',
  Viewer: '#888',
};
// ─── Constants ────────────────────────────────────────────────────────────────
const YELLOW = '#F5C518';
const BG = '#111111';
const CARD = '#1C1C1C';
const BORDER = '#2A2A2A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = '#888888';
// ─── Sub-components ───────────────────────────────────────────────────────────
const Avatar = ({
  initials,
  color,
  size = 38,
}: {
  initials: string;
  color: string;
  size?: number;
}) => (
  <View
    style={[
      styles.avatar,
      {
        backgroundColor: color + '33',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor: color,
      },
    ]}
  >
    <Text style={[styles.avatarText, { color, fontSize: moderateScale(size * 0.35) }]}>
      {initials}
    </Text>
  </View>
);
// ─── Tab Content ──────────────────────────────────────────────────────────────
const ClipsTab = () => (
  <View>
    {CLIPS.map((clip) => (
      <TouchableOpacity key={clip.id} style={styles.clipRow} activeOpacity={0.7}>
        <View style={styles.clipThumb}>
          <Ionicons name="play" size={moderateScale(18)} color={YELLOW} />
        </View>
        <View style={styles.clipInfo}>
          <Text style={styles.clipTitle}>{clip.title}</Text>
          <Text style={styles.clipMeta}>
            {clip.duration} · {clip.resolution}
          </Text>
        </View>
        <Text style={styles.clipDate}>{clip.date}</Text>
        <Ionicons name="ellipsis-vertical" size={moderateScale(16)} color={TEXT_MUTED} />
      </TouchableOpacity>
    ))}
    <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.8}>
      <Ionicons name="cloud-upload-outline" size={moderateScale(18)} color={TEXT_MUTED} />
      <Text style={styles.uploadBtnText}>Upload new clip</Text>
    </TouchableOpacity>
  </View>
);


const MembersTab = () => (
  <View>
    {MEMBERS.map((member) => (
      <View key={member.id} style={styles.memberRow}>
        <View>
          <Avatar initials={member.initials} color={member.color} />
          {member.online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={[styles.memberRole, { color: ROLE_COLORS[member.role] }]}>
            {member.role}
          </Text>
        </View>
        {member.role !== 'Owner' && (
          <TouchableOpacity style={styles.memberAction}>
            <Ionicons name="ellipsis-vertical" size={moderateScale(16)} color={TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>
    ))}
    <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.8}>
      <Ionicons name="person-add-outline" size={moderateScale(16)} color={YELLOW} />
      <Text style={styles.inviteBtnText}>Invite member</Text>
    </TouchableOpacity>
  </View>
);

const CommentsTab = () => (
  <View>
    {COMMENTS.map((comment) => (
      <View key={comment.id} style={styles.commentRow}>
        <Avatar initials={comment.initials} color={comment.color} size={34} />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{comment.author}</Text>
            <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
          </View>
          <View style={styles.commentClipTag}>
            <Ionicons name="attach" size={moderateScale(10)} color={TEXT_MUTED} />
            <Text style={styles.commentClipText}> {comment.clip}</Text>
          </View>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
      </View>
    ))}
  </View>
);

const SettingsTab = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [publicAccess, setPublicAccess] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const SettingToggle = ({
    icon,
    label,
    sub,
    value,
    onChange,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIconBox}>
        <Ionicons name={icon} size={moderateScale(18)} color={YELLOW} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#333', true: '#F5C51880' }}
        thumbColor={value ? '#F5C518' : '#666'}
      />
    </View>
  );
  const SettingAction = ({
    icon,
    label,
    sub,
    danger,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
      <View style={[styles.settingIconBox, danger && { backgroundColor: '#FF444420' }]}>
        <Ionicons
          name={icon}
          size={moderateScale(18)}
          color={danger ? '#FF4444' : YELLOW}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, danger && { color: '#FF4444' }]}>{label}</Text>
        <Text style={styles.settingSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={moderateScale(16)} color={danger ? '#FF4444' : TEXT_MUTED} />
    </TouchableOpacity>
  );
  return (
    <View>
      <Text style={styles.settingSection}>PROJECT</Text>
      <SettingAction icon="pencil-outline" label="Rename project" sub="Change the project display name" />
      <SettingAction icon="image-outline" label="Project thumbnail" sub="Update the cover image" />
      <SettingAction icon="settings-outline" label="Export settings" sub="Resolution, format, frame rate" />
      <Text style={styles.settingSection}>COLLABORATION</Text>
      <SettingToggle icon="notifications-outline" label="Notifications" sub="Get alerts for comments and edits" value={notifications} onChange={setNotifications} />
      <SettingToggle icon="save-outline" label="Auto-save" sub="Save changes every 30 seconds" value={autoSave} onChange={setAutoSave} />
      <SettingToggle icon="globe-outline" label="Public access" sub="Anyone with the link can view" value={publicAccess} onChange={setPublicAccess} />
      <SettingToggle icon="water-outline" label="Watermark" sub="Add studio watermark on export" value={watermark} onChange={setWatermark} />
      <Text style={styles.settingSection}>DANGER ZONE</Text>
      <SettingAction icon="swap-horizontal-outline" label="Transfer ownership" sub="Hand over project to another member" />
      <SettingAction icon="archive-outline" label="Archive project" sub="Hide project without deleting" danger />
      <SettingAction icon="trash-outline" label="Delete project" sub="Permanently remove this project" danger />
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProjectDetailScreen() {
    const navigation=useNavigation()
  const [activeTab, setActiveTab] = useState<Tab>('Clips');
  const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'Clips', icon: 'film-outline', iconActive: 'film' },
    { key: 'Members', icon: 'people-outline', iconActive: 'people' },
    { key: 'Comments', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
    { key: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
  ];
  const stats = [
    { label: 'Videos', value: 3, icon: 'videocam-outline' as keyof typeof Ionicons.glyphMap },
    { label: 'Members', value: 4, icon: 'people-outline' as keyof typeof Ionicons.glyphMap },
    { label: 'Comments', value: 7, icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap },
    { label: 'Versions', value: 12, icon: 'git-branch-outline' as keyof typeof Ionicons.glyphMap },
  ];
  const renderTab = () => {
    switch (activeTab) {
      case 'Clips': return <ClipsTab />;
      case 'Members': return <MembersTab />;
      case 'Comments': return <CommentsTab />;
      case 'Settings': return <SettingsTab />;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
        onPress={()=>navigation.navigate("projects")} 
        style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={moderateScale(20)} color={TEXT_PRIMARY} />
        </Pressable>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={moderateScale(20)} color={TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          <Ionicons name="film" size={moderateScale(52)} color={TEXT_MUTED} style={{ opacity: 0.4 }} />
        </View>
        {/* Title + Badge */}
        <View style={styles.titleRow}>
          <Text style={styles.projectTitle}>Summer campaign</Text>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItem}>
                <Ionicons name={stat.icon} size={moderateScale(14)} color={YELLOW} style={{ marginBottom: verticalScale(2) }} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>
        {/* CTA Buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={moderateScale(16)} color="#111" />
            <Text style={styles.primaryBtnText}>Open editor</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={moderateScale(16)} color={TEXT_PRIMARY} />
            <Text style={styles.secondaryBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={moderateScale(16)}
                  color={isActive ? YELLOW : TEXT_MUTED}
                  style={{ marginBottom: verticalScale(4) }}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.key}
                </Text>
                {isActive && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Tab Content */}
        <View style={styles.tabContent}>{renderTab()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingBottom: verticalScale(32),
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  headerBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Thumbnail
  thumbnail: {
    marginHorizontal: scale(16),
    height: verticalScale(180),
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(16),
  },
  projectTitle: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(20),
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A3D1A',
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: scale(5),
  },
  activeDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#4CAF50',
  },
  activeBadgeText: {
    color: '#4CAF50',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    marginBottom: verticalScale(16),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  statLabel: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
    marginTop: verticalScale(2),
  },
  statDivider: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: verticalScale(4),
  },
  // CTA
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    gap: scale(10),
    marginBottom: verticalScale(25),
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: YELLOW,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  primaryBtnText: {
    color: '#111',
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: verticalScale(4),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: verticalScale(10),
    paddingTop: verticalScale(6),
  },
  tabText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
    fontWeight: '500',
  },
  tabTextActive: {
    color: YELLOW,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: scale(6),
    right: scale(6),
    height: 2,
    backgroundColor: YELLOW,
    borderRadius: 2,
  },
  tabContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
  },
  // Clips
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    gap: scale(12),
  },
  clipThumb: {
    width: scale(44),
    height: scale(44),
    backgroundColor: '#2A2A2A',
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clipInfo: {
    flex: 1,
  },
  clipTitle: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  clipMeta: {
    color: TEXT_MUTED,
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
  },
  clipDate: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
  },
  uploadBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: verticalScale(4),
    backgroundColor: '#1A1A1A',
  },
  uploadBtnText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    gap: scale(12),
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarText: {
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#4CAF50',
    borderWidth: 1.5,
    borderColor: CARD,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
   memberRole: {
    fontSize: moderateScale(12),
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  memberAction: {
    padding: scale(8),
  },
  memberActionText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(16),
    letterSpacing: 1,
  },
  inviteBtn: {
    borderWidth: 1,
    borderColor: YELLOW + '60',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(8),
    alignItems: 'center',
    // flexDirection:'row',
    alignSelf:'center',
    width:'100%',
    marginTop: verticalScale(4),
    backgroundColor: YELLOW + '10',
  },
  inviteBtnText: {
    color: YELLOW,
    fontSize: moderateScale(14),
    fontWeight: '600',
   
  },
  // Comments
  commentRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    gap: scale(10),
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(4),
  },
  commentAuthor: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  commentTimestamp: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
  },
  commentClipTag: {
    backgroundColor: '#2A2A2A',
    borderRadius: moderateScale(6),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(6),
  },
  commentClipText: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
  },
  commentText: {
    color: '#CCCCCC',
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
  },
  // Settings
  settingSection: {
    color: TEXT_MUTED,
    fontSize: moderateScale(11),
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: moderateScale(12),
    padding: scale(14),
    marginBottom: verticalScale(8),
    gap: scale(12),
  },
  settingLabel: {
    color: TEXT_PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  settingSub: {
    color:TEXT_MUTED,
    fontSize:moderateScale(12),
    marginTop:verticalScale(2),
  },
  settingsActionText:{
 color:TEXT_MUTED,
    fontSize:moderateScale(12),
   fontWeight:'500'
  },
})