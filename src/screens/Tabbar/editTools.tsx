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
  action?: "duplicate" | "delete";
};
const tools: Tool[] = [
  {
    icon: "cut-outline",
    label: "Split",
   
  },
  {
    icon: "flame-outline",
    label: "Filter",
  
  },{
    icon: "text-outline",
    label: "Text",
    
  },
  {
    icon: "volume-high-outline",
    label: "Audio",
    
  },
   {
    icon: "musical-notes-outline",
    label: "Music",
    
  },
  {
    icon: "crop-outline",
    label: "Crop",
  
  },
  {
    icon: "speedometer-outline",
    label: "Speed",
  
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



interface BottomToolbarProps {
  onSplit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToolPress?: (toolLabel: string) => void;
}

export default function BottomToolbar({ onSplit, onDuplicate, onDelete, onToolPress }: BottomToolbarProps) {
  const handlePress = (tool: Tool) => {
    if (tool.action === "duplicate") {
      if (onDuplicate) onDuplicate();
      return;
    }
    if (tool.action === "delete") {
      if (onDelete) onDelete();
      return;
    }
    if (tool.label === "Split") {
      if (onSplit) onSplit();
      return;
    }
    if (onToolPress) {
      onToolPress(tool.label);
      return;
    }
    // if (tool.screen) {
    //   console.log(`Tool ${tool.label} pressed, but screen is disabled`);
    // }
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
