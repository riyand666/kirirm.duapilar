import React, { useState, useEffect, useRef } from "react";
import {
  Trash2,
  Plus,
  Save,
  Truck,
  Download,
  Cloud,
  Wifi,
  Users,
  RefreshCw,
  FolderOpen,
  FolderPlus,
  XCircle,
  FileText,
  Loader2,
  ChevronDown,
  Calendar,
  Coins,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BarChart3, // Icon baru untuk Grafik
  PieChart, // Icon baru untuk Grafik
} from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";

// --- 1. SETUP FIREBASE ---
let firebaseConfig;
let appId = "default-app-id";

try {
  // @ts-ignore
  if (typeof __firebase_config !== "undefined") {
    // @ts-ignore
    firebaseConfig = JSON.parse(__firebase_config);
    // @ts-ignore
    if (typeof __app_id !== "undefined") appId = __app_id;
  } else {
    throw new Error("Config not found");
  }
} catch (e) {
  firebaseConfig = {
    apiKey: "AIzaSyC_fwknhqvFppz6p-oetdgfBexP04GGNsA",
    authDomain: "duabersinar.firebaseapp.com",
    projectId: "duabersinar",
    storageBucket: "duabersinar.firebasestorage.app",
    messagingSenderId: "323228007014",
    appId: "1:323228007014:web:134a2da2769350f82f4ba7",
    measurementId: "G-VD7J95MBCQ",
  };
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- KOMPONEN CUSTOM DROPDOWN ---
const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  icon: Icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-10 pr-4 py-3 border rounded-xl text-left transition-all duration-200 ease-in-out cursor-pointer ${
          isOpen
            ? "border-blue-500 ring-4 ring-blue-50 bg-white shadow-md"
            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
        }`}
      >
        <span
          className={`block truncate ${
            !selectedOption ? "text-gray-400" : "text-gray-700 font-medium"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-blue-500" : ""
          }`}
        />
      </button>

      <div className="absolute left-3 top-3.5 text-gray-400 pointer-events-none transition-colors duration-200">
        {Icon && <Icon size={18} className={isOpen ? "text-blue-500" : ""} />}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <ul className="max-h-60 overflow-auto py-1 custom-scrollbar">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 text-center italic">
                Tidak ada data
              </li>
            ) : (
              options.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors duration-150 ${
                    value === opt.value
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- HELPER FORMAT ANGKA ---
const formatNumber = (num) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [entries, setEntries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  const [newDate, setNewDate] = useState("");
  const [newRupiah, setNewRupiah] = useState("");
  const [newRit, setNewRit] = useState("");
  const [newJenis, setNewJenis] = useState("Pasir");
  const [newCatatan, setNewCatatan] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // State untuk Toggle Grafik
  const [showChart, setShowChart] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        // @ts-ignore
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          // @ts-ignore
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        setErrorMsg(err.message);
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setErrorMsg("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const locCollection =
      appId === "default-app-id"
        ? collection(db, "master_locations")
        : collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "master_locations"
          );

    const unsubLoc = onSnapshot(
      locCollection,
      (snapshot) => {
        const fetchedLocs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        fetchedLocs.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setLocations(fetchedLocs);
      },
      (err) => console.error("Error fetch locations:", err)
    );

    const dataCollection =
      appId === "default-app-id"
        ? collection(db, "pencatatan_rit_harian")
        : collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "pencatatan_rit"
          );

    const unsubData = onSnapshot(
      dataCollection,
      (snapshot) => {
        const fetchedData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEntries(fetchedData);
        setLoading(false);
      },
      (error) => {
        console.error("Error mengambil data:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubLoc();
      unsubData();
    };
  }, [user]);

  // --- LOGIC AGGREGASI DATA UTK GRAFIK ---
  const calculateChartData = () => {
    const stats = {};
    let grandTotal = 0;

    // 1. Hitung total per lokasi
    entries.forEach((item) => {
      const locName = item.lokasi || "Tanpa Lokasi";
      if (!stats[locName]) stats[locName] = 0;
      const nominal = parseInt(item.rupiah) || 0;
      stats[locName] += nominal;
      grandTotal += nominal;
    });

    // 2. Ubah ke array dan sort dari terbesar
    const sortedData = Object.keys(stats)
      .map((key) => ({ name: key, total: stats[key] }))
      .sort((a, b) => b.total - a.total); // Terbesar di atas

    // 3. Cari nilai tertinggi utk skala grafik (100% width)
    const maxVal = sortedData.length > 0 ? sortedData[0].total : 0;

    return { sortedData, maxVal, grandTotal };
  };

  const {
    sortedData: chartData,
    maxVal: maxChartVal,
    grandTotal,
  } = calculateChartData();

  // --- LOGIC TABLE ---
  const filteredEntries = entries.filter((item) => {
    if (!selectedLocation) return false;
    return item.lokasi?.trim() === selectedLocation.trim();
  });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key])
      return sortConfig.direction === "asc" ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key])
      return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocationName.trim() || !user) return;
    try {
      const locCollection =
        appId === "default-app-id"
          ? collection(db, "master_locations")
          : collection(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "master_locations"
            );

      const exists = locations.some(
        (l) => l.name.toLowerCase() === newLocationName.trim().toLowerCase()
      );
      if (exists) {
        alert("Nama lokasi sudah ada!");
        return;
      }

      await addDoc(locCollection, {
        name: newLocationName.trim(),
        createdAt: new Date().toISOString(),
      });
      setSelectedLocation(newLocationName.trim());
      setNewLocationName("");
      setIsAddingLocation(false);
    } catch (err) {
      alert("Gagal tambah lokasi: " + err.message);
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;
    const locObj = locations.find((l) => l.name === selectedLocation);
    if (!locObj) return;
    if (
      window.confirm(
        `Hapus Lokasi "${selectedLocation}"?\nData aman, hanya menu dihapus.`
      )
    ) {
      try {
        const docRef =
          appId === "default-app-id"
            ? doc(db, "master_locations", locObj.id)
            : doc(
                db,
                "artifacts",
                appId,
                "public",
                "data",
                "master_locations",
                locObj.id
              );
        await deleteDoc(docRef);
        setSelectedLocation("");
      } catch (err) {
        alert("Gagal hapus lokasi.");
      }
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleRupiahChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
      setNewRupiah("");
      return;
    }
    setNewRupiah("Rp. " + rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (
      !newDate ||
      !newRupiah ||
      !newRit ||
      !newJenis ||
      !selectedLocation ||
      !user
    )
      return;
    setIsSaving(true);
    const cleanRupiah = parseInt(newRupiah.replace(/\D/g, ""));
    const newItem = {
      date: newDate,
      rupiah: cleanRupiah,
      rit: parseInt(newRit),
      jenis: newJenis,
      lokasi: selectedLocation,
      catatan: newCatatan,
      createdAt: new Date().toISOString(),
      userId: user.uid,
    };
    try {
      const targetCollection =
        appId === "default-app-id"
          ? collection(db, "pencatatan_rit_harian")
          : collection(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "pencatatan_rit"
            );
      await addDoc(targetCollection, newItem);
      setNewRupiah("");
      setNewRit("");
      setNewCatatan("");
      setIsSaving(false);
    } catch (error) {
      alert("Gagal menyimpan: " + error.message);
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (window.confirm("Hapus data ritase ini?")) {
      try {
        const docRef =
          appId === "default-app-id"
            ? doc(db, "pencatatan_rit_harian", id)
            : doc(
                db,
                "artifacts",
                appId,
                "public",
                "data",
                "pencatatan_rit",
                id
              );
        await deleteDoc(docRef);
      } catch (error) {
        alert("Gagal menghapus.");
      }
    }
  };

  const downloadCSV = () => {
    const headers = ["Tanggal,Rit,Jenis,Lokasi,Rupiah,Catatan"];
    const rows = sortedEntries.map(
      (item) =>
        `${formatDateDisplay(item.date)},${item.rit},${item.jenis},"${
          item.lokasi
        }",${item.rupiah},"${item.catatan || ""}"`
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Laporan_${selectedLocation || "Semua"}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRupiah = filteredEntries.reduce(
    (sum, item) => sum + (item.rupiah || 0),
    0
  );
  const totalRit = filteredEntries.reduce(
    (sum, item) => sum + (item.rit || 0),
    0
  );

  const SortableHeader = ({ label, sortKey, align = "left", width }) => (
    <th
      className={`p-3 border-b-2 border-blue-800 cursor-pointer hover:bg-blue-700 transition-colors ${width} text-${align}`}
      onClick={() => handleSort(sortKey)}
    >
      <div
        className={`flex items-center gap-1 ${
          align === "right"
            ? "justify-end"
            : align === "center"
            ? "justify-center"
            : "justify-start"
        }`}
      >
        {label}
        {sortConfig.key === sortKey ? (
          sortConfig.direction === "asc" ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )
        ) : (
          <ArrowUpDown size={14} className="opacity-40" />
        )}
      </div>
    </th>
  );

  const jenisOptions = [
    { value: "Pasir", label: "Pasir" },
    { value: "Batu", label: "Batu" },
    { value: "Split", label: "Split" },
    { value: "Tanah", label: "Tanah" },
  ];

  const locationOptions = locations.map((loc) => ({
    value: loc.name,
    label: loc.name,
  }));

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full">
          <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Memuat Aplikasi...
          </h2>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );

  if (errorMsg)
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded shadow-xl border-l-4 border-red-500 max-w-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p>{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <RefreshCw size={18} /> Coba Lagi
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden pb-10">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white shadow-lg relative">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
              <Truck size={32} className="text-yellow-400" />
              Catatan Kiriman
            </h1>
            <p className="text-blue-100 text-sm mt-1 flex items-center gap-2 font-medium">
              <Wifi size={14} className="text-green-400" /> Terhubung Database
            </p>
          </div>
          <Cloud
            size={200}
            className="absolute -right-10 -top-10 text-white opacity-10 pointer-events-none"
          />
        </div>

        {/* GRAFIK TOTAL (NEW FEATURE) */}
        <div className="bg-white border-b border-gray-200">
          <div
            className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowChart(!showChart)}
          >
            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-600" />
              Ringkasan Semua Lokasi
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Total: Rp. {formatNumber(grandTotal)}
              </span>
            </h2>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${
                showChart ? "rotate-180" : ""
              }`}
            />
          </div>

          {showChart && (
            <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
              {chartData.length === 0 ? (
                <div className="text-center text-gray-400 py-6 italic border-2 border-dashed border-gray-100 rounded-xl">
                  Belum ada data transaksi di sistem.
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {chartData.map((item, idx) => {
                    const percent =
                      maxChartVal > 0 ? (item.total / maxChartVal) * 100 : 0;
                    return (
                      <div key={item.name} className="group">
                        <div className="flex justify-between text-sm mb-1 font-medium text-gray-600">
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            {item.name}
                          </span>
                          <span className="font-mono text-gray-800">
                            Rp. {formatNumber(item.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out group-hover:from-blue-400 group-hover:to-purple-400"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PILIH LOKASI */}
        <div className="bg-gray-50 p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="w-full md:w-auto flex-grow max-w-xl">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FolderOpen size={16} /> Pilih Lokasi Proyek
              </label>

              <div className="flex gap-2 w-full">
                <div className="flex-grow">
                  <CustomDropdown
                    options={locationOptions}
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    placeholder="-- Pilih Lokasi --"
                    icon={null}
                  />
                </div>

                {selectedLocation && (
                  <button
                    onClick={handleDeleteLocation}
                    className="bg-white hover:bg-red-50 text-red-500 hover:text-red-600 px-4 rounded-xl border border-gray-200 hover:border-red-200 transition-all active:scale-95 shadow-sm"
                    title="Hapus Lokasi Ini"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full md:w-auto">
              {!isAddingLocation ? (
                <button
                  onClick={() => setIsAddingLocation(true)}
                  className="w-full md:w-auto bg-white text-blue-600 border border-blue-200 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 h-[50px]"
                >
                  <FolderPlus size={20} /> Lokasi Baru
                </button>
              ) : (
                <form
                  onSubmit={handleAddLocation}
                  className="flex gap-2 w-full md:w-auto animate-fadeIn"
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nama..."
                    className="p-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 w-full font-medium"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 shadow-md"
                  >
                    <Save size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingLocation(false)}
                    className="bg-white text-gray-500 p-3 rounded-xl hover:bg-gray-100 border border-gray-200"
                  >
                    <XCircle size={24} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* KONTEN UTAMA */}
        {!selectedLocation ? (
          <div className="p-16 text-center text-gray-400 bg-white">
            <div className="bg-gray-50 p-6 rounded-full inline-block mb-4 shadow-sm">
              <FolderOpen size={48} className="text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-600">
              Lokasi Belum Dipilih
            </h3>
            <p className="text-gray-500 mt-2">
              Silakan pilih lokasi di atas untuk memulai input data.
            </p>
          </div>
        ) : (
          <>
            {/* FORM INPUT */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                  <Plus size={20} className="text-blue-600" />
                  Input Data:{" "}
                  <span className="text-blue-700 underline decoration-dotted">
                    {selectedLocation}
                  </span>
                </h2>
              </div>

              <form
                onSubmit={handleAddEntry}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 items-end bg-gray-50/80 p-6 rounded-2xl border border-gray-100 shadow-inner"
              >
                <div className="col-span-1 group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Tanggal
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm font-medium cursor-pointer hover:border-blue-300"
                    />
                    <Calendar
                      size={18}
                      className="absolute left-3 top-3.5 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Muatan
                  </label>
                  <CustomDropdown
                    options={jenisOptions}
                    value={newJenis}
                    onChange={setNewJenis}
                    icon={Truck}
                    placeholder="Pilih Muatan"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Jumlah Rit
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newRit}
                    onChange={(e) => setNewRit(e.target.value)}
                    className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm font-bold text-center hover:border-blue-300"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Total Rupiah
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Rp. 0"
                      value={newRupiah}
                      onChange={handleRupiahChange}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm font-mono text-right font-medium hover:border-blue-300"
                    />
                    <Coins
                      size={18}
                      className="absolute left-3 top-3.5 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                    Catatan
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ket..."
                      value={newCatatan}
                      onChange={(e) => setNewCatatan(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm italic text-sm hover:border-blue-300"
                    />
                    <FileText
                      size={18}
                      className="absolute left-3 top-3.5 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-200"
                  }`}
                >
                  {isSaving ? (
                    "..."
                  ) : (
                    <>
                      <Save size={20} /> Simpan
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* TABEL DATA */}
            <div className="flex flex-col">
              <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100">
                <div className="text-sm text-gray-500 font-medium">
                  Menampilkan <b>{sortedEntries.length}</b> data
                </div>
                <button
                  onClick={downloadCSV}
                  disabled={sortedEntries.length === 0}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download size={16} /> Unduh Excel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                      <SortableHeader
                        label="Tanggal"
                        sortKey="date"
                        width="w-[15%]"
                      />
                      <SortableHeader
                        label="Rit"
                        sortKey="rit"
                        align="center"
                        width="w-[10%]"
                      />
                      <SortableHeader
                        label="Muatan"
                        sortKey="jenis"
                        align="center"
                        width="w-[10%]"
                      />
                      <SortableHeader
                        label="Rupiah"
                        sortKey="rupiah"
                        align="right"
                        width="w-[20%]"
                      />
                      <th className="p-4 border-b border-gray-200 w-[35%] text-left">
                        Catatan
                      </th>
                      <th className="p-4 border-b border-gray-200 w-[10%] text-center">
                        Hapus
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-12 text-center text-gray-400 italic bg-gray-50/30"
                        >
                          Belum ada data untuk lokasi ini.
                        </td>
                      </tr>
                    ) : (
                      sortedEntries.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/50 transition-colors group"
                        >
                          <td className="p-4 font-medium text-gray-700 text-sm">
                            {formatDateDisplay(item.date)}
                          </td>
                          <td className="p-4 text-center font-bold text-gray-800">
                            {item.rit}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${
                                item.jenis === "Batu"
                                  ? "bg-gray-100 text-gray-600 border border-gray-200"
                                  : item.jenis === "Pasir"
                                  ? "bg-yellow-50 text-yellow-700 border border-yellow-100"
                                  : "bg-blue-50 text-blue-700 border border-blue-100"
                              }`}
                            >
                              {item.jenis}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-gray-700 font-medium">
                            {formatNumber(item.rupiah)}
                          </td>
                          <td className="p-4 text-gray-500 italic text-sm">
                            {item.catatan || "-"}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteEntry(item.id)}
                              className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {sortedEntries.length > 0 && (
                    <tfoot className="bg-blue-50 border-t border-blue-100 font-bold text-gray-800">
                      <tr>
                        <td className="p-4 text-right text-blue-800 uppercase text-xs tracking-wider">
                          Total
                        </td>
                        <td className="p-4 text-center text-lg">{totalRit}</td>
                        <td></td>
                        <td className="p-4 text-right text-lg font-mono text-blue-700">
                          {formatNumber(totalRupiah)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="max-w-6xl mx-auto mt-6 text-center text-gray-400 text-xs pb-4">
        &copy; 2025 Aplikasi Pencatatan Kiriman
      </div>
    </div>
  );
};

export default App;
