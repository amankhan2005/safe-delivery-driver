import { create } from 'zustand';

const useOrderStore = create((set) => ({
  activeOrder:      null,
  orders:           [],
  availableOrders:  [],
  setActiveOrder:     (activeOrder)     => set({ activeOrder }),
  clearActiveOrder:   ()                => set({ activeOrder: null }),
  setOrders:          (orders)          => set({ orders }),
  setAvailableOrders: (availableOrders) => set({ availableOrders }),
}));

export default useOrderStore;
