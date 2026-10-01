import axios from 'axios'
import { taxOn } from './money'
import { localDay } from './dates'

const http = axios.create({ baseURL: '/api', withCredentials: true })
const get = (u, p) => http.get(u, { params: p }).then((r) => r.data)

const real = {
  menu: () => get('/menu'),
  tables: () => get('/tables'),
  orders: (status) => get('/orders', { status }).then((r) => r.data ?? r),
  history: ({ from, to } = {}) => get('/orders', { from, to, per_page: 1000 }).then((r) => r.data ?? r),
  order: (id) => get(`/orders/${id}`),
  createOrder: (p) => http.post('/orders', p).then((r) => r.data),
  sendToKitchen: (id) => http.post(`/orders/${id}/send-to-kitchen`).then((r) => r.data),
  setStatus: (id, status) => http.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
  setType: (id, type) => http.patch(`/orders/${id}`, { type }).then((r) => r.data),
  pay: (id, payments) => http.post(`/orders/${id}/payments`, { payments }).then((r) => r.data),
  setTableStatus: (id, status) => http.patch(`/tables/${id}/status`, { status }).then((r) => r.data),
  billTemplate: () => get('/settings/bill_template'),
  saveBillTemplate: (t) => http.put('/settings/bill_template', t).then((r) => r.data),
}

const db = {
  categories:  [
  { id: 1, name: 'Chinese Chicken Starters' },
  { id: 2, name: 'Chinese Veg Starters' },
  { id: 3, name: 'Mutton Items' },
  { id: 4, name: 'Beef Items' },
  { id: 5, name: 'Indian Special Gravy' },
  { id: 6, name: 'Tandoori Chicken' },
  { id: 7, name: 'Veg Tikka' },
  { id: 8, name: 'Grill & Alfham' },
  { id: 9, name: 'Roti & Naan' },
  { id: 10, name: 'Parotta & Tawa Items' },
  { id: 11, name: 'Dosa' },
  { id: 12, name: 'Chicken & Chinese Rice' },
  { id: 13, name: 'Veg Rice & Noodles' },
  { id: 14, name: 'Chinese Noodles' },
  { id: 15, name: 'Fresh Juices' },
  { id: 16, name: 'Mojito & Soda' },
  { id: 17, name: 'Shakes & Desserts' },
  { id: 18, name: 'Sandwich & Burger' },
  { id: 19, name: 'Tea & Hot Beverages' }
],
  items:  [
  [1, 1, "Chicken 65", 18000, "https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg"],
  [2, 1, "Chicken Kondattam", 20000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [3, 1, "Chicken Crispy", 20000, "https://images.pexels.com/photos/1352270/pexels-photo-1352270.jpeg"],
  [4, 1, "Japanese Chicken", 22000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [5, 1, "Garlic Chicken - Dry", 20000, "https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg"],
  [6, 1, "Garlic Chicken - Gravy", 21000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [7, 1, "Ginger Chicken - Dry", 20000, "https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg"],
  [8, 1, "Ginger Chicken - Gravy", 21000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [9, 1, "Chicken Dynamite", 23000, "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg"],
  [10, 1, "Chicken Schezwan", 21000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [11, 1, "Bullet Chicken", 22000, "https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg"],
  [12, 1, "Lemon Chicken", 21000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [13, 2, "Paneer 65", 17000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [14, 2, "Paneer Kondattam", 18000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [15, 2, "Paneer Manchurian - Dry", 18000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [16, 2, "Paneer Manchurian - Gravy", 19000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [17, 2, "Paneer Crispy", 18000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [18, 2, "Paneer Schezwan", 19000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [19, 2, "Paneer Dynamite", 20000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [20, 2, "Mushroom 65", 15000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [21, 2, "Mushroom Kondattam", 16000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [22, 2, "Mushroom Crispy", 16000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [23, 2, "Mushroom Schezwan", 17000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [24, 2, "Mushroom Manchurian - Dry", 16000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [25, 2, "Mushroom Manchurian - Gravy", 17000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [26, 3, "Mutton Chukka", 32000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [27, 3, "Mutton Pepper Fry - Dry", 33000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [28, 3, "Mutton Pepper - Gravy", 34000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [29, 3, "Mutton Crispy", 33000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [30, 3, "Mutton Rogan Josh", 36000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [31, 3, "Mutton Kheema", 32000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [32, 4, "Beef Chilli Dry", 20000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [33, 4, "Beef Chukka", 19000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [34, 4, "Beef Pepper Fry", 20000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [35, 4, "Beef Curry", 18000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [36, 4, "Beef Kondattam", 20000, "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg"],
  [37, 5, "Chicken Mughlai", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [38, 5, "Chicken Punjabi", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [39, 5, "Chicken Kolhapuri - Spicy", 24000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [40, 5, "Chicken Hyderabadi", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [41, 5, "Chicken Tikka Masala", 25000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [42, 5, "Chicken Kheema", 24000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [43, 5, "Chicken Do Pyaza", 23000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [44, 5, "Chicken Reshmi Masala", 25000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [45, 5, "Chicken Angara", 24000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [46, 5, "Butter Chicken", 25000, "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg"],
  [47, 6, "Chicken Tikka", 24000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [48, 6, "Chicken Malai Tikka", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [49, 6, "Chicken Hariyali Tikka", 25000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [50, 6, "Chicken Reshmi Tikka", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [51, 6, "Chicken Afghani Tikka", 27000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [52, 6, "Prawn Tikka", 35000, "https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg"],
  [53, 6, "Chicken Seekh Kebab", 25000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [54, 6, "Chicken Tangdi Kebab", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [55, 6, "Tandoori Chicken - Full", 48000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [56, 6, "Tandoori Chicken - Half", 26000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [57, 6, "Tandoori Chicken Malai - Full", 52000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [58, 6, "Tandoori Chicken Malai - Half", 28000, "https://images.pexels.com/photos/2232433/pexels-photo-2232433.jpeg"],
  [59, 7, "Paneer Tikka", 22000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [60, 7, "Paneer Hariyali Tikka", 23000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [61, 7, "Paneer Malai Tikka", 24000, "https://images.pexels.com/photos/3928854/pexels-photo-3928854.jpeg"],
  [62, 7, "Mushroom Tikka", 19000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [63, 7, "Mushroom Hariyali Tikka", 20000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [64, 7, "Mushroom Malai Tikka", 21000, "https://images.pexels.com/photos/2583852/pexels-photo-2583852.jpeg"],
  [65, 8, "Grill Chicken - Full", 46000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [66, 8, "Grill Chicken - Half", 25000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [67, 8, "Pepper Grill - Full", 48000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [68, 8, "Pepper Grill - Half", 26000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [69, 8, "Honey Lemon Grill - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [70, 8, "Honey Lemon Grill - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [71, 8, "Chicken Alfham - Full", 46000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [72, 8, "Chicken Alfham - Half", 25000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [73, 8, "Pepper Alfham - Full", 48000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [74, 8, "Pepper Alfham - Half", 26000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [75, 8, "Honey Alfham - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [76, 8, "Honey Alfham - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [77, 8, "Peri Peri Alfham - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [78, 8, "Peri Peri Alfham - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [79, 8, "BBQ Alfham - Full", 50000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [80, 8, "BBQ Alfham - Half", 27000, "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg"],
  [81, 9, "Plain Roti", 2000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [82, 9, "Butter Roti", 3000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [83, 9, "Plain Naan", 3500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [84, 9, "Butter Naan", 4500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [85, 9, "Garlic Naan", 5500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [86, 9, "Plain Kulcha", 4000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [87, 9, "Butter Kulcha", 5000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [88, 9, "Plain Rumali Roti", 3000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [89, 9, "Butter Rumali Roti", 4000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [90, 9, "Chicken Kheema Roti", 9000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [91, 10, "Normal Parotta", 1500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [92, 10, "Bun Parotta", 3000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [93, 10, "Nool Parotta", 2500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [94, 10, "Silvan Parotta", 3500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [95, 10, "Chicken Stuffed Parotta", 9000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [96, 10, "Chicken Kothu Parotta", 16000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [97, 10, "Egg Kothu Parotta", 12000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [98, 10, "Veg Kothu Parotta", 11000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [99, 10, "Yella Parotta", 4000, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [100, 10, "Plain Chapati", 1500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [101, 10, "Butter Chapati", 2500, "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg"],
  [102, 11, "Ghee Roast", 8000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [103, 11, "Plain Roast", 6000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [104, 11, "Onion Roast", 7000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [105, 11, "Podi Dosa", 7000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [106, 11, "Egg Dosa", 8000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [107, 11, "Kall Dosa", 3000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [108, 11, "Onion Uttapam", 9000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [109, 11, "Masala Dosa", 8000, "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg"],
  [110, 12, "Chicken Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [111, 12, "Egg Rice", 14000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [112, 12, "Veg Rice", 13000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [113, 12, "Schezwan Chicken Rice", 19000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [114, 12, "Schezwan Veg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [115, 12, "Singapore Chicken Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [116, 12, "Singapore Egg Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [117, 12, "Singapore Veg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [118, 12, "Hong Kong Chicken Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [119, 12, "Hong Kong Egg Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [120, 12, "Hong Kong Veg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [121, 12, "Garlic Chicken Rice", 19000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [122, 12, "Garlic Egg Rice", 16000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [123, 12, "Garlic Veg Rice", 15000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [124, 12, "Chicken Pulao", 20000, "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg"],
  [125, 13, "Paneer Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [126, 13, "Paneer Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [127, 13, "Paneer Schezwan Rice", 19000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [128, 13, "Paneer Schezwan Noodles", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [129, 13, "Paneer Singapore Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [130, 13, "Paneer Singapore Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [131, 13, "Paneer Hong Kong Rice", 20000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [132, 13, "Paneer Hong Kong Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [133, 13, "Mushroom Rice", 15000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [134, 13, "Mushroom Noodles", 15000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [135, 13, "Mushroom Schezwan Rice", 17000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [136, 13, "Mushroom Schezwan Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [137, 13, "Mushroom Singapore Rice", 18000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [138, 13, "Mushroom Singapore Noodles", 18000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [139, 13, "Mushroom Hong Kong Rice", 18000, "https://images.pexels.com/photos/3926123/pexels-photo-3926123.jpeg"],
  [140, 13, "Mushroom Hong Kong Noodles", 18000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [141, 14, "Chicken Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [142, 14, "Egg Noodles", 14000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [143, 14, "Veg Noodles", 13000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [144, 14, "Schezwan Chicken Noodles", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [145, 14, "Schezwan Egg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [146, 14, "Schezwan Veg Noodles", 15000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [147, 14, "Singapore Chicken Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [148, 14, "Singapore Egg Noodles", 17000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [149, 14, "Singapore Veg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [150, 14, "Garlic Chicken Noodles", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [151, 14, "Garlic Egg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [152, 14, "Garlic Veg Noodles", 15000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [153, 14, "Hong Kong Chicken Noodles", 20000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [154, 14, "Hong Kong Veg Noodles", 16000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [155, 14, "American Chopsuey - Chicken", 22000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [156, 14, "American Chopsuey - Veg", 19000, "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg"],
  [157, 15, "Pineapple Juice", 8000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [158, 15, "Orange Juice", 8000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [159, 15, "Apple Juice", 10000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [160, 15, "Mosambi Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [161, 15, "Papaya Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [162, 15, "Grapes Juice", 8000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [163, 15, "Pomegranate Juice", 11000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [164, 15, "Beetroot Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [165, 15, "Watermelon Juice", 6000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [166, 15, "Carrot Juice", 7000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [167, 15, "Mango Juice", 9000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [168, 15, "Lemon Juice", 3000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [169, 15, "Mint Lime Juice", 4000, "https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg"],
  [170, 16, "Strawberry Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [171, 16, "Blueberry Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [172, 16, "Blue Curacao Mojito", 11000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [173, 16, "Pineapple Mojito", 11000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [174, 16, "Watermelon Mojito", 11000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [175, 16, "Green Apple Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [176, 16, "Blackberry Mojito", 12000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [177, 16, "Mint Lime Mojito", 9000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [178, 16, "Mint Lemon Soda", 4000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [179, 16, "Lemon Soda", 3000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [180, 16, "Kulki Soda", 4000, "https://images.pexels.com/photos/4051222/pexels-photo-4051222.jpeg"],
  [181, 17, "Strawberry Shake", 11000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [182, 17, "Vanilla Shake", 10000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [183, 17, "Pista Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [184, 17, "Mango Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [185, 17, "Chocolate Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [186, 17, "Butterscotch Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [187, 17, "Sarjha Shake", 13000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [188, 17, "Oreo Shake", 13000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [189, 17, "Cold Boost", 11000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [190, 17, "Cold Coffee", 10000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [191, 17, "Rose Milk", 7000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [192, 17, "Black Currant Shake", 12000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [193, 17, "Royal Falooda", 15000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [194, 17, "SPL Falooda", 18000, "https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg"],
  [195, 17, "Fruit Salad", 10000, "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg"],
  [196, 18, "Chicken Sandwich", 11000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [197, 18, "Veg Sandwich", 8000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [198, 18, "Paneer Sandwich", 11000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [199, 18, "Mushroom Sandwich", 10000, "https://images.pexels.com/photos/1603901/pexels-photo-1603901.jpeg"],
  [200, 18, "Chicken Burger", 13000, "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg"],
  [201, 18, "Veg Burger", 10000, "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg"],
  [202, 18, "Chicken Popcorn", 15000, "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg"],
  [203, 18, "French Fries", 9000, "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg"],
  [204, 18, "Fried Chicken", 18000, "https://images.pexels.com/photos/1352270/pexels-photo-1352270.jpeg"],
  [205, 19, "Normal Tea", 1500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [206, 19, "Ginger Tea", 2000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [207, 19, "Elaichi Tea", 2000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [208, 19, "Coffee", 2000, "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg"],
  [209, 19, "Boost", 3000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [210, 19, "Badam Milk", 4000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [211, 19, "Horlicks", 3000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [212, 19, "Sukku Milk", 2000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [213, 19, "Parti Milk", 3000, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [214, 19, "Black Tea", 1200, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [215, 19, "Lemon Tea", 1500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [216, 19, "Honey Tea", 2500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [217, 19, "Green Tea", 2500, "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg"],
  [218, 19, "Black Coffee", 1500, "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg"]
].map(([id, category_id, name, price, image]) => ({ id, category_id, name, price, image: image || null, is_available: true })),
  tables: [
    ['Indoor', 1], ['Indoor', 2], ['Indoor', 3], ['Outdoor', 4], ['Outdoor', 5],
  ].map(([zone, n]) => ({ id: n, name: `Table ${String(n).padStart(2, '0')}`, zone, status: 'available' })),
  orders: [],
  seq: 1,
}
// Demo history: two weeks of finished orders so the History page has something to show.
;(() => {
  let seed = 7
  const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n) }
  const past = []
  for (let day = 14; day >= 1; day--) {
    for (let k = 3 + rnd(4); k > 0; k--) {
      const at = new Date(); at.setDate(at.getDate() - day); at.setHours(11 + rnd(11), rnd(60), 0, 0)
      const items = Array.from({ length: 1 + rnd(4) }, () => {
        const m = db.items[rnd(db.items.length)]
        return { menu_item_id: m.id, name: m.name, unit_price: m.price, quantity: 1 + rnd(3), notes: '' }
      })
      const type = ['dine_in', 'dine_in', 'takeaway', 'delivery'][rnd(4)]
      const subtotal = items.reduce((t, i) => t + i.unit_price * i.quantity, 0), tax = taxOn(subtotal)
      const cancelled = rnd(12) === 0
      past.push({
        type, table_id: type === 'dine_in' ? 1 + rnd(db.tables.length) : null, notes: null, items, subtotal, tax,
        total: subtotal + tax, status: cancelled ? 'CANCELLED' : 'COMPLETED',
        payment_status: cancelled ? 'unpaid' : 'paid', paid: cancelled ? 0 : subtotal + tax, created_at: at.toISOString(),
      })
    }
  }
  past.sort((x, y) => x.created_at.localeCompare(y.created_at))
  for (const o of past) db.orders.unshift({ id: db.seq, number: `ORD-${1000 + db.seq++}`, ...o })
})()

const FLOW = { NEW: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY'], READY: ['SERVED'], SERVED: ['COMPLETED'] }
const find = (id) => db.orders.find((o) => o.id === id)
export const CLEANING_MS = 5 * 60 * 1000
const BILL_KEY = 'pos.billTemplate'
const setTable = (t, status) => {
  t.status = status
  if (status !== 'occupied') t.occupied_at = null
  t.cleaning_since = status === 'cleaning' ? new Date().toISOString() : null
}

const mock = {
  menu: async () => ({ categories: db.categories, items: db.items }),
  tables: async () => {
    // A table being cleaned frees itself once CLEANING_MS has passed.
    for (const t of db.tables) {
      if (t.status === 'cleaning' && Date.now() - Date.parse(t.cleaning_since) >= CLEANING_MS) setTable(t, 'available')
    }
    return db.tables.map((t) => ({ ...t }))
  },
  orders: async (status) => db.orders.filter((o) => !status || o.status === status).map((o) => ({ ...o })),
  order: async (id) => ({ ...find(id) }),
  history: async ({ from, to } = {}) => db.orders
    .filter((o) => (!from || localDay(o.created_at) >= from) && (!to || localDay(o.created_at) <= to))
    .map((o) => ({ ...o })),
  createOrder: async (p) => {
    const items = p.items.map((i) => {
      const m = db.items.find((x) => x.id === i.menu_item_id)
      return { ...i, name: m.name, unit_price: m.price }
    })
    const subtotal = items.reduce((t, i) => t + i.unit_price * i.quantity, 0)
    const tax = taxOn(subtotal)
    const o = {
      id: db.seq, number: `ORD-${1000 + db.seq++}`, type: p.type, table_id: p.table_id, notes: p.notes || null,
      status: 'NEW', payment_status: 'unpaid', items, subtotal, tax, total: subtotal + tax,
      created_at: new Date().toISOString(),
    }
    db.orders.unshift(o)
    const t = db.tables.find((x) => x.id === p.table_id)
    if (t) {
      if (t.status !== 'occupied') t.occupied_at = o.created_at // start of this party's visit
      t.status = 'occupied'
    }
    return { ...o }
  },
  sendToKitchen: async (id) => mock.setStatus(id, 'CONFIRMED'),
  setStatus: async (id, status) => {
    const o = find(id)
    if (!FLOW[o.status]?.includes(status)) throw new Error(`Cannot move ${o.status} to ${status}`)
    if (status === 'COMPLETED' && o.payment_status !== 'paid') throw new Error('Order is not fully paid')
    o.status = status
    if (status === 'COMPLETED') {
      const t = db.tables.find((x) => x.id === o.table_id)
      if (t) setTable(t, 'cleaning')
    }
    if (status === 'CANCELLED') {
      // Nothing was served, so a table left with no other open orders is simply free again.
      const t = db.tables.find((x) => x.id === o.table_id)
      const others = db.orders.some((x) => x !== o && x.table_id === o.table_id && !['COMPLETED', 'CANCELLED'].includes(x.status))
      if (t?.status === 'occupied' && !others) setTable(t, 'available')
    }
    return { ...o }
  },
  setType: async (id, type) => {
    const o = find(id)
    o.type = type
    return { ...o }
  },
  pay: async (id, payments) => {
    const o = find(id)
    o.paid = (o.paid || 0) + payments.reduce((t, p) => t + p.amount, 0)
    o.payment_status = o.paid >= o.total ? 'paid' : 'partial'
    return { ...o }
  },
  setTableStatus: async (id, status) => {
    const t = db.tables.find((x) => x.id === id)
    setTable(t, status)
    return { ...t }
  },
  // Kept in the browser so the layout survives reloads in demo mode.
  billTemplate: async () => {
    try { return JSON.parse(localStorage.getItem(BILL_KEY)) } catch { return null }
  },
  saveBillTemplate: async (t) => {
    try { localStorage.setItem(BILL_KEY, JSON.stringify(t)) } catch {}
    return t
  },
}

export const api = import.meta.env.VITE_MOCK === 'false' ? real : mock
