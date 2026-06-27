/**Vydora — Editor S
/**
Vydora — Editor Screen (Project)
Pure UI — no interactions wired
*/
import React from "react";
import {
  View,
  Text,
  StyleSheet,
 
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView,} from "react-native-safe-area-context"
import type { ComponentProps } from "react";
/* ─── Icon Type ─── */
type IonIconName = ComponentProps<typeof Ionicons>["name"];
/* ─── Design Tokens ─── */
const C = {
  bg: "#0E0E0E",
  surface: "#1A1A1A",
  surfaceAlt: "#222222",
  border: "#2C2C2C",
  accent: "#F5C518",
  textPrimary: "#FFFFFF",
  textSub: "#8A8A8A",
  textMuted: "#555555",
  purple: "#A259FF",
};
/* ─── Divider ─── */
function Divider() {
  return <View style={styles.divider} />;
}
/* ─── Toggle ─── */
function Toggle({ on }:any) {
  return (
    <View style={[styles.toggle, on ? styles.toggleOn : null]}>
      <View style={[styles.toggleThumb, on ? styles.toggleThumbOn : null]} />
    </View>
  );
}
/* ─── Top Bar ─── */
function TopBar() {
   const navigation=useNavigation()
  return (
    <View style={styles.topBar}>
      <Pressable
      onPress={()=>navigation.navigate("projects")} 
      style={styles.topBarLeft}>
        <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        <Text style={styles.topBarTitle}>Go to Dashboard</Text>
      </Pressable>
      <Toggle on={true} />
    </View>
  );
}
/* ─── Video Preview ─── */
function VideoPreview() {
  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewFrame}>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={24} color={C.accent} />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>00:14 / 01:32</Text>
        </View>
        <View style={styles.projectLabel}>
          <Text style={styles.projectLabelText}>Project text</Text>
        </View>
      </View>
    </View>
  );
}
/* ─── Tool Row ─── */
const TOOLS = [
  { icon: "cut-outline", label: "Trim" },
  { icon: "git-branch-outline", label: "Split" },
  { icon: "speedometer-outline", label: "Speed" },
  { icon: "refresh-outline", label: "Rotate" },
  { icon: "crop-outline", label: "Crop" },
  { icon: "musical-notes-outline", label: "Audio" },
  { icon: "sparkles-outline", label: "Effect" },
  { icon: "options-outline", label: "Adjust" },
] as const satisfies readonly { icon: IonIconName; label: string }[];



function ToolRow() {
  return (
    <View style={styles.toolSection}>
      <View style={styles.toolHeader}>
        <Text style={styles.toolHeaderLabel}>TOOLS</Text>
        <TouchableOpacity style={styles.savedBtn}>
          <Text style={styles.savedBtnText}>Saved</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.editstuffcontainer}>
        {TOOLS.map((tool) => (
          <View key={tool.label} style={styles.toolItem}>
            <View style={styles.toolIconBox}>
              <Ionicons
                name={tool.icon}
                size={20}
                color={C.textPrimary}
              />
            </View>
            <Text style={styles.toolLabel}>
              {tool.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}


/* ─── Timeline Strip ─── */
const CLIPS = [
  { color: C.accent, width: 80, active: true },
  { color: C.accent, width: 52, active: false },
  { color: C.surface, width: 28, active: false },
  { color: C.purple, width: 36, active: false },
];
// function TimelineStrip() {
//   return (
//     <View style={styles.timelineWrap}>
//       <View style={styles.timelineRow}>
//         <Text style={styles.timelineTrackLetter}>V</Text>
//         <View style={styles.timelineBar}>
//           {CLIPS.map((clip, i) => (
//             <View
//               key={i}
//               style={[
//                 styles.clip,
//                 { backgroundColor: clip.color, width: clip.width },
//                 clip.active && styles.clipActive,
//               ]}
//             />
//           ))}
//         </View>
//       </View>
//       <View style={styles.playhead} />
//     </View>
//   );
// }
/* ─── Sync Row ─── */

/* ─── Bottom Nav ─── */
// const NAV_ITEMS = [
//   { icon: "cut-outline", label: "Edit" },
//   { icon: "film-outline", label: "Timeline" },
//   { icon: "text-outline", label: "Text" },
//   { icon: "color-filter-outline", label: "Filters" },
//   { icon: "share-outline", label: "Export" },
// ] as const satisfies readonly { icon: IonIconName; label: string }[];
// function BottomNav() {
//   return (
//     <View style={styles.bottomNav}>
//       {NAV_ITEMS.map((item, i) => {
//         const active = i === 0;
//         return (
//           <TouchableOpacity key={item.label} style={styles.navItem}>
//             <Ionicons
//               name={item.icon}
//               size={22}
//               color={active ? C.accent : C.textSub}
//             />
//             <Text style={[styles.navLabel, active && styles.navLabelActive]}>
//               {item.label}
//             </Text>
//             {active && <View style={styles.navDot} />}
//           </TouchableOpacity>
//         );
//       })}
//     </View>
//   );
// }
/* ─── Root ─── */
export default function EditorScreen() {
 
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <TopBar />
      <Divider />
      <VideoPreview />
      <Divider />
      <ToolRow />
      {/* <Divider /> */}
    
      <View style={styles.spacer} />
      {/* <Divider /> */}
      {/* <BottomNav /> */}
    </SafeAreaView>
  );
}
/* ─── Styles ─── */
 const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  spacer: {
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.border,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleOn: {
    backgroundColor: C.accent,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.textSub,
  },
  toggleThumbOn: {
    backgroundColor: C.bg,
    alignSelf: "flex-end",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topBarTitle: {
    color: C.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },
  previewContainer: {
    paddingHorizontal: s(16),
    // paddingVertical: 14,
    marginTop:s(30),
    paddingBottom:s(30)
  },
  previewFrame: {
    width: "100%",
    height: s(255),
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(245,197,24,0.12)",
    borderWidth: 1.5,
    borderColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  durationText: {
    color: C.textPrimary,
    fontSize: 11,
  },
  projectLabel: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.40)",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  projectLabelText: {
    color: C.textSub,
    fontSize: 11,
  },
  toolSection: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  toolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toolHeaderLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  savedBtn: {
    backgroundColor: C.accent,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom:s(15),
  },
  savedBtnText: {
    color: C.bg,
    fontSize: 11,
    fontWeight: "700",
  },
  toolScroll: {
    paddingHorizontal: 16,
    // gap: 20,
  },
 
  timelineWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

   toolItem: {
    alignItems: "center",
    // gap: s(6),
    width:'21%',
    marginBottom:s(10),
    
  },
  toolIconBox: {
    width: '88%',
    height: s(50),
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    // gap:s(2)
   
  },
  toolLabel: {
    color: C.textSub,
    fontSize: s(10),
    textAlign:'center',
    marginTop:s(5),
  },

  editstuffcontainer:{
 flexDirection:'row',
 justifyContent:'space-between',
 flexWrap:'wrap',
 width:'100%',
 paddingHorizontal:s(12),


  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineTrackLetter: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    width: 14,
  },
  timelineBar: {
    flex: 1,
    flexDirection: "row",
    gap: 3,
    height: 28,
    alignItems: "center",
  },
  clip: {
    height: 28,
    borderRadius: 4,
    opacity: 0.75,
  },
  clipActive: {
    opacity: 1,
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  playhead: {
    position: "absolute",
    top: 8,
    left: 42,
    width: 2,
    height: 38,
    backgroundColor: C.accent,
    borderRadius: 1,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  syncText: {
    color: C.textMuted,
    fontSize: 11,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 18,
    backgroundColor: C.bg,
  },
  navItem: {
    alignItems: "center",
    gap: 4,
    position: "relative",
    paddingHorizontal: 10,
  },
  navLabel: {
    color: C.textSub,
    fontSize: 10,
  },
  navLabelActive: {
    color: C.accent,
  },
  navDot: {
    position: "absolute",
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
 });