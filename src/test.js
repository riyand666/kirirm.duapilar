import React, { useState, useEffect } from "react";
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
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  FolderPlus,
  XCircle,
  AlertCircle,
  FileText, // Icon untuk Catatan
} from "lucide-react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
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
    apiKey: "", // Diisi oleh environment
    authDomain: "duabersinar.firebaseapp.com",
    projectId: "duabersinar",
    storageBucket: "duabersinar.firebasestorage.app",
    messagingSenderId: "323228007014",
    appId: "1:323228007014:web:134a2da2769350f82f4ba7",
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
  // --- STATE UTAMA ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Data Ritase
  const [entries, setEntries] = useState([]);

  // Data Lokasi (Master)
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  // Form Input Ritase
  const [newDate, setNewDate] = useState("");
  const [newRupiah, setNewRupiah] = useState("");
  const [newRit, setNewRit] = useState("");
  const [newJenis, setNewJenis] = useState("Pasir");
  const [newCatatan, setNewCatatan] = useState(""); // State baru untuk Catatan
  const [isSaving, setIsSaving] = useState(false);

  // --- 2. AUTHENTICATION ---
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

  // --- 3. KONEKSI DATA ---

  // A. Ambil Daftar Lokasi (Master Data)
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

    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
  }, [user]);

  // B. Ambil Data Ritase
  useEffect(() => {
    if (!user) return;
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

    const unsubscribe = onSnapshot(
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
    return () => unsubscribe();
  }, [user]);

  // --- 4. LOGIKA FILTER & SORTIR ---

  const filteredEntries = entries.filter((item) => {
    if (!selectedLocation) return false;
    return item.lokasi?.trim() === selectedLocation.trim();
  });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key])
      return sortConfig.direction === "asc" ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key])
      return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // --- 5. LOGIKA LOKASI (ADD & DELETE) ---

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
        `Hapus Lokasi "${selectedLocation}" dari daftar menu?\n\nCatatan: Data ritase lama TIDAK akan terhapus, hanya pilihan lokasi yang hilang.`
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

  // --- 6. LOGIKA INPUT DATA RITASE ---

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

  const formatNumber = (num) =>
    num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

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
      catatan: newCatatan, // Simpan Catatan
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
      setNewCatatan(""); // Reset Catatan
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
    // Tambah Catatan ke Header
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

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded shadow-xl border-l-4 border-red-500 max-w-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Koneksi</h2>
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
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-blue-800 p-5 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3">
                <Truck size={32} className="text-yellow-400" />
                Aplikasi Ritase
              </h1>
              <p className="text-blue-200 text-sm mt-1 flex items-center gap-2">
                <Wifi
                  size={14}
                  className={
                    loading ? "text-yellow-300 animate-pulse" : "text-green-400"
                  }
                />
                {loading ? "Menghubungkan..." : "Terhubung Database"}
              </p>
            </div>
          </div>
          <Cloud
            size={200}
            className="absolute -right-10 -top-10 text-white opacity-10 pointer-events-none"
          />
        </div>

        {/* PILIH LOKASI */}
        <div className="bg-blue-50 p-6 border-b border-blue-100">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="w-full md:w-auto flex-grow max-w-xl">
              <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                <FolderOpen size={18} /> Pilih Lokasi Proyek (Sheet)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="flex-grow p-3 rounded-lg border-2 border-blue-200 focus:border-blue-600 focus:outline-none bg-white text-lg font-medium text-gray-800 shadow-sm"
                >
                  <option value="">-- Pilih Lokasi Dulu --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                {selectedLocation && (
                  <button
                    onClick={handleDeleteLocation}
                    className="bg-red-100 hover:bg-red-200 text-red-600 p-3 rounded-lg border border-red-200 transition-colors"
                    title="Hapus Lokasi Ini"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full md:w-auto">
              {!isAddingLocation ? (
                <button
                  onClick={() => setIsAddingLocation(true)}
                  className="w-full md:w-auto bg-white text-blue-600 border border-blue-200 px-4 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <FolderPlus size={18} /> Buat Lokasi Baru
                </button>
              ) : (
                <form
                  onSubmit={handleAddLocation}
                  className="flex gap-2 w-full md:w-auto animate-fadeIn"
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nama Lokasi..."
                    className="p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
                  >
                    <Save size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingLocation(false)}
                    className="bg-gray-200 text-gray-600 p-3 rounded-lg hover:bg-gray-300"
                  >
                    <XCircle size={20} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* KONTEN UTAMA */}
        {!selectedLocation ? (
          <div className="p-12 text-center text-gray-400 bg-white">
            <FolderOpen size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">
              Silakan pilih atau buat Lokasi Proyek di atas untuk memulai.
            </p>
          </div>
        ) : (
          <>
            {/* FORM INPUT */}
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Plus size={20} className="text-green-600" />
                  Input Data:{" "}
                  <span className="text-blue-600 underline decoration-dotted">
                    {selectedLocation}
                  </span>
                </h2>
              </div>

              {/* Grid Layout disesuaikan menjadi 6 kolom untuk memuat Catatan */}
              <form
                onSubmit={handleAddEntry}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100"
              >
                {/* Tanggal */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Jenis */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Muatan
                  </label>
                  <div className="relative">
                    <select
                      value={newJenis}
                      onChange={(e) => setNewJenis(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Pasir">Pasir</option>
                      <option value="Batu">Batu</option>
                      <option value="Tanah">Split</option>
                    </select>
                    <Truck
                      size={16}
                      className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Rit */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Jumlah Rit
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newRit}
                    onChange={(e) => setNewRit(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium text-center"
                  />
                </div>

                {/* Rupiah */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Total Rupiah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Rp. 0"
                    value={newRupiah}
                    onChange={handleRupiahChange}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-right"
                  />
                </div>

                {/* Catatan (Input Baru) */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Catatan
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Keterangan..."
                      value={newCatatan}
                      onChange={(e) => setNewCatatan(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 italic text-sm"
                    />
                    <FileText
                      size={16}
                      className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Tombol Simpan */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full p-2.5 rounded-lg font-bold text-white shadow-md transform active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSaving ? (
                    "..."
                  ) : (
                    <>
                      <Save size={18} /> Simpan
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* TABEL DATA */}
            <div className="flex flex-col">
              <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100">
                <div className="text-sm text-gray-500">
                  Menampilkan <b>{sortedEntries.length}</b> data
                </div>
                <button
                  onClick={downloadCSV}
                  disabled={sortedEntries.length === 0}
                  className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1 disabled:opacity-50"
                >
                  <Download size={16} /> Unduh Excel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b-2 border-gray-200">
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
                      {/* Header Kolom Catatan */}
                      <th className="p-3 border-b-2 border-blue-800 w-[35%] text-left">
                        Catatan
                      </th>
                      <th className="p-3 text-center w-[10%]">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedEntries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-12 text-center text-gray-400 italic"
                        >
                          Belum ada data.
                        </td>
                      </tr>
                    ) : (
                      sortedEntries.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50 transition-colors group"
                        >
                          <td className="p-4 font-medium text-gray-700">
                            {formatDateDisplay(item.date)}
                          </td>
                          <td className="p-4 text-center font-bold text-gray-800 bg-gray-50/50">
                            {item.rit}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                item.jenis === "Batu"
                                  ? "bg-gray-200 text-gray-600"
                                  : item.jenis === "Pasir"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {item.jenis}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-gray-700">
                            {formatNumber(item.rupiah)}
                          </td>
                          {/* Data Catatan */}
                          <td className="p-4 text-gray-600 italic text-sm">
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
                    <tfoot className="bg-blue-50 border-t-2 border-blue-100 font-bold text-gray-800">
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
      <div className="max-w-6xl mx-auto mt-4 text-center text-gray-400 text-xs">
        &copy; 2025 Aplikasi Pencatatan Ritase
      </div>
    </div>
  );
};

export default App;
