// components/TaskChecklist.tsx - Task List with Dopamine Effects
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { MicroTask } from '../services/openai';

interface TaskChecklistProps {
  tasks: MicroTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask?: (task: Omit<MicroTask, 'id'>) => void;
  onRemoveTask?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<MicroTask>) => void;
  editable?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

// Individual Task Item with animations
function TaskItem({
  task,
  onToggle,
  onRemove,
  editable,
  compact,
  index,
}: {
  task: MicroTask;
  onToggle: () => void;
  onRemove?: () => void;
  editable: boolean;
  compact: boolean;
  index: number;
}) {
  const checkScale = useSharedValue(1);
  const rowScale = useSharedValue(1);
  const sparkleOpacity = useSharedValue(0);
  const [showSparkles, setShowSparkles] = useState(false);

  const handleToggle = () => {
    if (!task.completed) {
      // Completing a task - dopamine effects!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Checkbox pop animation
      checkScale.value = withSequence(
        withSpring(1.4, { damping: 4, stiffness: 400 }),
        withSpring(0.8, { damping: 6 }),
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
      
      // Row celebration bounce
      rowScale.value = withSequence(
        withSpring(1.03, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
      
      // Show sparkles
      setShowSparkles(true);
      sparkleOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 })
      );
      setTimeout(() => setShowSparkles(false), 500);
    } else {
      // Uncompleting - subtle feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onToggle();
  };

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  const getDurationColor = (duration: number) => {
    if (duration <= 10) return '#10B981';
    if (duration <= 20) return '#F59E0B';
    return '#6366F1';
  };

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50)}
      exiting={FadeOut}
      layout={Layout.springify()}
      style={rowAnimatedStyle}
    >
      <TouchableOpacity
        style={[
          styles.taskRow,
          task.completed && styles.taskRowCompleted,
          compact && styles.taskRowCompact,
        ]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {/* Checkbox with animation */}
        <Animated.View style={checkAnimatedStyle}>
          <View
            style={[
              styles.checkbox,
              task.completed && styles.checkboxCompleted,
            ]}
          >
            {task.completed && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
        </Animated.View>

        {/* Sparkle effects */}
        {showSparkles && (
          <Animated.View style={[styles.sparkleContainer, sparkleAnimatedStyle]}>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <View
                key={i}
                style={[
                  styles.sparkle,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateX: 20 },
                    ],
                    backgroundColor: i % 2 === 0 ? '#FCD34D' : '#10B981',
                  },
                ]}
              />
            ))}
          </Animated.View>
        )}

        {/* Task content */}
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              task.completed && styles.taskTitleCompleted,
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {task.title}
          </Text>
          {!compact && (
            <View style={styles.taskMeta}>
              <View
                style={[
                  styles.durationBadge,
                  { backgroundColor: `${getDurationColor(task.duration)}15` },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={getDurationColor(task.duration)}
                />
                <Text
                  style={[
                    styles.durationText,
                    { color: getDurationColor(task.duration) },
                  ]}
                >
                  {task.duration} min
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Remove button */}
        {editable && onRemove && !compact && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TaskChecklist({
  tasks,
  onToggleTask,
  onAddTask,
  onRemoveTask,
  onUpdateTask,
  editable = true,
  showProgress = true,
  compact = false,
}: TaskChecklistProps) {
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(15);
  const progressScale = useSharedValue(1);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTime = tasks.reduce((sum, t) => sum + t.duration, 0);
  const completedTime = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.duration, 0);

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      // Animate progress bar when completing
      progressScale.value = withSequence(
        withSpring(1.02, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
    }
    onToggleTask(taskId);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddTask?.({
      title: newTaskTitle.trim(),
      duration: newTaskDuration,
      completed: false,
    });

    setNewTaskTitle('');
    setNewTaskDuration(15);
    setShowAddInput(false);
  };

  const handleRemoveTask = (taskId: string) => {
    Alert.alert('Remove Task', 'Are you sure you want to remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRemoveTask?.(taskId);
        },
      },
    ]);
  };

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressScale.value }],
  }));

  const allCompleted = tasks.length > 0 && completedCount === tasks.length;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      {showProgress && tasks.length > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {allCompleted ? '🎉 All done!' : `${completedCount} of ${tasks.length} completed`}
            </Text>
            <Text style={styles.timeText}>
              {completedTime}/{totalTime} min
            </Text>
          </View>
          <Animated.View style={[styles.progressBarContainer, progressAnimatedStyle]}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${(completedCount / tasks.length) * 100}%`,
                    backgroundColor: allCompleted ? '#10B981' : '#6366F1',
                  },
                ]}
                layout={Layout.springify()}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* Task list */}
      <View style={styles.taskList}>
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => handleToggleTask(task.id)}
            onRemove={onRemoveTask ? () => handleRemoveTask(task.id) : undefined}
            editable={editable}
            compact={compact}
            index={index}
          />
        ))}
      </View>

      {/* Add task input */}
      {editable && onAddTask && (
        <>
          {showAddInput ? (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.addInputContainer}
            >
              <TextInput
                style={styles.addInput}
                placeholder="Enter a task..."
                placeholderTextColor="#9CA3AF"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
                onSubmitEditing={handleAddTask}
              />
              <View style={styles.durationPicker}>
                {[10, 15, 20, 30].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      newTaskDuration === duration && styles.durationOptionActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setNewTaskDuration(duration);
                    }}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        newTaskDuration === duration &&
                          styles.durationOptionTextActive,
                      ]}
                    >
                      {duration}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.addInputActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddInput(false);
                    setNewTaskTitle('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleAddTask}
                >
                  <Text style={styles.confirmButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddInput(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
              <Text style={styles.addButtonText}>Add task</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressBarContainer: {
    transformOrigin: 'left',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  taskList: {
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  taskRowCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  taskRowCompact: {
    padding: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  sparkleContainer: {
    position: 'absolute',
    left: 25,
    top: '50%',
    width: 44,
    height: 44,
    marginTop: -22,
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    left: 19,
    top: 19,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  taskTitleCompleted: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 6,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '500',
  },
  addInputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  addInput: {
    fontSize: 15,
    color: '#111827',
    padding: 0,
    marginBottom: 12,
  },
  durationPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  durationOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  durationOptionActive: {
    backgroundColor: '#6366F1',
  },
  durationOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  durationOptionTextActive: {
    color: '#FFFFFF',
  },
  addInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
