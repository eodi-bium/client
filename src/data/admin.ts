export const adminItemOptions = [
  { value: 'BATTERY', label: '폐건전지' },
  { value: 'LIGHT', label: '폐형광등' },
  { value: 'PHONE', label: '폐휴대폰' },
  { value: 'CLOTHES', label: '의류' },
] as const;

export const adminStatCards = [
  {
    id: 'distributed',
    label: 'Total Points Distributed',
    value: '45,680',
    change: '+12.4%',
    changeLabel: 'vs last month',
    icon: 'ri-bar-chart-box-line',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'redeemed',
    label: 'Points Redeemed',
    value: '28,420',
    change: '+6.2%',
    changeLabel: 'vs last month',
    icon: 'ri-exchange-dollar-line',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    id: 'active-users',
    label: 'Active Participants',
    value: '1,847',
    change: '+18.9%',
    changeLabel: 'vs last month',
    icon: 'ri-team-line',
    gradient: 'from-orange-500 to-red-500',
  },
] as const;

export const adminQuickActions = [
  {
    id: 'bulk-credit',
    icon: 'ri-upload-cloud-line',
    title: 'Bulk Credit',
    description: 'Upload a CSV file to credit multiple accounts at once.',
  },
  {
    id: 'rules',
    icon: 'ri-settings-4-line',
    title: 'Adjust Rules',
    description: 'Configure point earning rules and thresholds.',
  },
  {
    id: 'report',
    icon: 'ri-bar-chart-line',
    title: 'Generate Report',
    description: 'Download monthly point distribution summaries.',
  },
] as const;

export const adminRecentActivities = [
  {
    id: 'activity-1',
    user: 'user_1023',
    item: 'Battery',
    points: '+450 P',
    date: '2024-11-17 13:42',
    status: 'completed' as const,
  },
  {
    id: 'activity-2',
    user: 'user_0874',
    item: 'Small Appliance',
    points: '+320 P',
    date: '2024-11-17 10:18',
    status: 'completed' as const,
  },
  {
    id: 'activity-3',
    user: 'user_1168',
    item: 'Fluorescent Lamp',
    points: '+150 P',
    date: '2024-11-16 19:07',
    status: 'pending' as const,
  },
] as const;

export const adminSuccessSummary = {
  title: 'Submission processed',
  description:
    'Points have been credited successfully. You can review the details in the activity log.',
} as const;
