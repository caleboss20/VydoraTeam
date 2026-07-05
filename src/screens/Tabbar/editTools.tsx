import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { s } from "react-native-size-matters";
type Tool = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen?: string;
  action?: "duplicate" | "delete";
};
const tools: Tool[] = [
  {
    icon: "cut-outline",
    label: "Split",
    screen: "SplitScreen",
  },
  {
    icon: "flame-outline",
    label: "Effects",
    screen: "EffectsScreen",
  },
  {
    icon: "volume-high-outline",
    label: "Audio",
    screen: "AudioScreen",
  },
  {
    icon: "crop-outline",
    label: "Crop",
    screen: "CropScreen",
  },
  {
    icon: "speedometer-outline",
    label: "Speed",
    screen: "SpeedScreen",
  },
  {
    icon: "copy-outline",
    label: "Duplicate",
    action: "duplicate",
  },
  {
    icon: "trash-outline",
    label: "Delete",
    action: "delete",
  },
];

// function ToolbarIcon({ name, active }: { name: keyof typeof Ionicons.glyphMap; active?: boolean }) {
//   return (
//     <TouchableOpacity style={[styles.toolbarIconButton, active && styles.toolbarIconButtonActive]} hitSlop={8}>
//       <Ionicons name={name} size={scale(20)} color={active ? COLORS.purple : COLORS.textPrimary} />
//     </TouchableOpacity>
//   );
// }

export default function BottomToolbar() {
  const navigation = useNavigation<any>();
  const handlePress = (tool: Tool) => {
    if (tool.screen) {
      navigation.navigate(tool.screen);
      return;
    }
    if (tool.action === "duplicate") {
      console.log("Duplicate clip");
      return;
    }
    if (tool.action === "delete") {
      console.log("Delete clip");
      return;
    }
  };
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.label}
            style={styles.tool}
            activeOpacity={0.7}
            onPress={() => handlePress(tool)}
          >
            <Ionicons name={tool.icon} size={22} color="#FFFFFF" />
            {/* <Text style={styles.label}>
              {tool.label}
            </Text> */}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    // backgroundColor: '#0E0E10',

    borderTopWidth: 1,
    borderTopColor: "#2A2A2E",
    paddingVertical: s(10),
  },
  scrollContent: {
    paddingHorizontal: s(10),
    alignItems: "center",
    paddingBottom: s(20),
    justifyContent: "center",
  },
  tool: {
    width: s(55),
    alignItems: "center",
    justifyContent: "center",
    paddingTop: s(20),
    // marginHorizontal: s(4),
  },
  label: {
    color: "#FFFFFF",
    fontSize: s(11),
    marginTop: s(5),
  },
});
