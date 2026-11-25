import ParkingSlotPicker from './ParkingSlotPicker';

export default {
  title: 'Common/Parking/ParkingSlotPicker',
  component: ParkingSlotPicker,
  tags: ['autodocs'],
  argTypes: {
    isLoading: { control: 'boolean', description: 'Trạng thái tải dữ liệu' },
    selectedSlotId: { control: 'text', description: 'ID ô đỗ đang chọn' },
    onSelectSlot: { action: 'slotSelected' },
  },
};

const sampleSlots = [
  { id: '1', code: 'A-01', floor: 'B1', zone: 'A', status: 'available' },
  { id: '2', code: 'A-02', floor: 'B1', zone: 'A', status: 'available' },
  { id: '3', code: 'A-03', floor: 'B1', zone: 'A', status: 'available' },
  { id: '4', code: 'B-01', floor: 'B1', zone: 'B', status: 'available' },
  { id: '5', code: 'B-02', floor: 'B1', zone: 'B', status: 'available' },
  { id: '6', code: 'C-01', floor: 'B2', zone: 'C', status: 'available' },
  { id: '7', code: 'C-02', floor: 'B2', zone: 'C', status: 'available' },
  { id: '8', code: 'C-03', floor: 'B2', zone: 'C', status: 'available' },
];

export const Default = {
  args: {
    availableSlots: sampleSlots,
    selectedSlotId: '2',
  },
};

export const Loading = {
  args: {
    availableSlots: [],
    isLoading: true,
  },
};

export const Empty = {
  args: {
    availableSlots: [],
    isLoading: false,
  },
};
