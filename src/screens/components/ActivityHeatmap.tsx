/**
 * GitHub-style edit-intensity grid for project version history.
 * Rows = Sun–Sat, columns = weeks (newest on the right).
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { scale, moderateScale, verticalScale } from 'react-native-size-matters';
import { ThemeColors } from '../Contexts/ThemeContext';

export type DayKey = string; // YYYY-MM-DD local

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const WEEKS = 14;
const CELL = scale(11);
const GAP = scale(3);

export function toDayKey(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatDayHeading(key: DayKey): string {
  const d = parseDayKey(key);
  const today = toDayKey(new Date());
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (key === today) return 'Today';
  if (key === toDayKey(yest)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

type Props = {
  colors: ThemeColors;
  isDark?: boolean;
  /** dayKey → activity count */
  countsByDay: Record<DayKey, number>;
  selectedDay: DayKey | null;
  onSelectDay: (day: DayKey | null) => void;
};

function intensityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 3;
  const r = count / max;
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

function cellColor(colors: ThemeColors, level: 0 | 1 | 2 | 3 | 4, isDark: boolean): string {
  if (level === 0) return colors.border;
  const darkRamp = ['#3A3418', '#6B5A14', '#A88B12', colors.accent] as const;
  const lightRamp = ['#F5E9B0', '#F0D86A', '#E5C020', colors.accent] as const;
  const ramp = isDark ? darkRamp : lightRamp;
  return ramp[level - 1] ?? colors.accent;
}

export function ActivityHeatmap({
  colors,
  isDark = true,
  countsByDay,
  selectedDay,
  onSelectDay,
}: Props) {
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { columns, maxCount, activeDays } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // End on this week's Saturday so the grid aligns like GitHub.
    const end = new Date(today);
    const dow = end.getDay(); // 0 Sun
    end.setDate(end.getDate() + (6 - dow));

    const cols: DayKey[][] = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const week: DayKey[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(end);
        cell.setDate(end.getDate() - w * 7 - (6 - d));
        week.push(toDayKey(cell));
      }
      cols.push(week);
    }

    let max = 0;
    let active = 0;
    Object.values(countsByDay).forEach((n) => {
      if (n > 0) active += 1;
      if (n > max) max = n;
    });
    return { columns: cols, maxCount: max, activeDays: active };
  }, [countsByDay]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.title}>Edit activity</Text>
        <Text style={styles.meta}>
          {activeDays} active day{activeDays === 1 ? '' : 's'} · last {WEEKS} weeks
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScroll}
      >
        <View style={styles.gridRow}>
          <View style={styles.weekdayCol}>
            {WEEKDAYS.map((label, i) => (
              <Text
                key={`${label}-${i}`}
                style={[styles.weekday, i % 2 === 1 && { opacity: 0 }]}
              >
                {label}
              </Text>
            ))}
          </View>

          {columns.map((week, wi) => (
            <View key={`w-${wi}`} style={styles.weekCol}>
              {week.map((dayKey) => {
                const count = countsByDay[dayKey] ?? 0;
                const level = intensityLevel(count, maxCount);
                const selected = selectedDay === dayKey;
                const future = parseDayKey(dayKey).getTime() > Date.now();
                return (
                  <TouchableOpacity
                    key={dayKey}
                    disabled={future || count === 0}
                    activeOpacity={0.75}
                    onPress={() =>
                      onSelectDay(selected ? null : dayKey)
                    }
                    style={[
                      styles.cell,
                      {
                        backgroundColor: future
                          ? 'transparent'
                          : cellColor(colors, level, isDark),
                      },
                      selected && styles.cellSelected,
                      future && styles.cellFuture,
                    ]}
                    accessibilityLabel={
                      count
                        ? `${formatDayHeading(dayKey)}, ${count} versions`
                        : formatDayHeading(dayKey)
                    }
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <View
            key={lvl}
            style={[
              styles.legendCell,
              {
                backgroundColor:
                  lvl === 0
                    ? colors.border
                    : cellColor(colors, lvl as 1 | 2 | 3 | 4, isDark),
              },
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>

      <Text style={styles.hint}>
        Tap a day to see exactly what was saved and when.
      </Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderRadius: scale(14),
      borderWidth: 1,
      borderColor: c.border,
      padding: scale(14),
      marginBottom: verticalScale(16),
    },
    headRow: {
      marginBottom: verticalScale(12),
      gap: verticalScale(4),
    },
    title: {
      color: c.text,
      fontSize: moderateScale(15),
      fontWeight: '700',
    },
    meta: {
      color: c.textSecondary,
      fontSize: moderateScale(12),
      lineHeight: moderateScale(17),
    },
    gridScroll: {
      paddingVertical: verticalScale(4),
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    weekdayCol: {
      marginRight: scale(6),
      justifyContent: 'space-between',
      height: 7 * CELL + 6 * GAP,
      paddingTop: 0,
    },
    weekday: {
      height: CELL,
      marginBottom: GAP,
      color: c.textMuted,
      fontSize: moderateScale(9),
      fontWeight: '600',
      textAlign: 'right',
      width: scale(12),
    },
    weekCol: {
      marginRight: GAP,
    },
    cell: {
      width: CELL,
      height: CELL,
      borderRadius: scale(2),
      marginBottom: GAP,
    },
    cellSelected: {
      borderWidth: 2,
      borderColor: c.text,
    },
    cellFuture: {
      opacity: 0,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(4),
      marginTop: verticalScale(10),
      justifyContent: 'flex-end',
    },
    legendText: {
      color: c.textMuted,
      fontSize: moderateScale(10),
      marginHorizontal: scale(2),
    },
    legendCell: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(2),
    },
    hint: {
      color: c.textMuted,
      fontSize: moderateScale(11),
      marginTop: verticalScale(10),
      lineHeight: moderateScale(16),
    },
  });
}
