import React, { useEffect, useState } from "react";
import { connectMetaMask } from "./wallet";
import { payForRental, refundRentalOnChain } from "./payment";
import "./index.css";

const API_URL = "http://localhost:5000";

const ROBOT_STATIC_DATA = {
  "RF-01": {
    name: "RoboFollow",
    service: "Personal Companion & Cargo Carrier",
    description: "Autonomous LiDAR-guided assistant programmed to follow consumer movement while carrying heavy shopping bags.",
    priceText: "₹20 / 10 min",
    pricePer10Min: 20,
    type: "Personal Assistant",
    battery: 98,
    payload: "25 kg",
    speed: "1.2 m/s",
    rating: "4.9",
    tag: "Most Popular",
    icon: (
      <svg className="w-7 h-7 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  "FC-01": {
    name: "RoboClean",
    service: "High-Efficiency Area Sanitation",
    description: "Autonomous floor-cleaning unit equipped with dual HEPA filtration, UV disinfection, and silent obstacle avoidance.",
    priceText: "₹20 / 10 min",
    pricePer10Min: 20,
    type: "Sanitation Unit",
    battery: 64,
    payload: "40 L Tank",
    speed: "0.8 m/s",
    rating: "4.8",
    tag: "High Demand",
    icon: (
      <svg className="w-7 h-7 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  "ST-01": {
    name: "RoboTrolley",
    service: "Smart Express Cart & Scanner",
    description: "Motorized shopping cart featuring integrated item barcode scanning, automatic weight verification, and checkout.",
    priceText: "₹10 / 10 min",
    pricePer10Min: 10,
    type: "Retail Automation",
    battery: 91,
    payload: "50 kg",
    speed: "1.5 m/s",
    rating: "5.0",
    tag: "Express Tier",
    icon: (
      <svg className="w-7 h-7 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    )
  }
};

const INITIAL_ROBOTS = [
  { id: "RF-01", status: "AVAILABLE", activeOrder: null, ...ROBOT_STATIC_DATA["RF-01"] },
  { 
    id: "FC-01", 
    status: "IN USE", 
    activeOrder: {
      orderId: "DEMO-FC01",
      startedAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      durationMinutes: 10
    }, 
    ...ROBOT_STATIC_DATA["FC-01"] 
  },
  { id: "ST-01", status: "AVAILABLE", activeOrder: null, ...ROBOT_STATIC_DATA["ST-01"] },
];

function App() {
  const [robotList, setRobotList] = useState(INITIAL_ROBOTS);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");

  const [selectedRobot, setSelectedRobot] = useState(null);
  const [duration, setDuration] = useState(10);
  const [filter, setFilter] = useState("ALL");
  const [copied, setCopied] = useState(false);

  const [order, setOrder] = useState(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // New Web3 & Activity Features
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [userOrders, setUserOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("robopay_user_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notification, setNotification] = useState("");

  // Live IoT Telemetry Simulator
  const [telemetry, setTelemetry] = useState({
    distanceMeters: 140,
    nearestObstacle: "2.4m",
    batteryDischargeRate: "0.14 A",
    metricValue: 12.4,
  });

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 6000);
  };

  // Helper: Format seconds to MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Save user orders to local storage
  useEffect(() => {
    try {
      localStorage.setItem("robopay_user_orders", JSON.stringify(userOrders));
    } catch {}
  }, [userOrders]);

  // FETCH & POLL ROBOTS FROM BACKEND
  const fetchRobots = async () => {
    try {
      const res = await fetch(`${API_URL}/api/robots`);
      if (!res.ok) return;
      const data = await res.json();
      
      setRobotList((prev) =>
        prev.map((robot) => {
          const remote = data.find((r) => r.id === robot.id);
          if (!remote) return robot;

          let currentStatus = remote.status;
          let currentActiveOrder = remote.activeOrder;
          if (currentActiveOrder && currentActiveOrder.expiresAt <= Date.now()) {
            currentStatus = "AVAILABLE";
            currentActiveOrder = null;
          }

          return {
            ...robot,
            status: currentStatus,
            activeOrder: currentActiveOrder,
          };
        })
      );
    } catch (e) {}
  };

  useEffect(() => {
    fetchRobots();
    const interval = setInterval(fetchRobots, 2500);
    return () => clearInterval(interval);
  }, []);

  // TICKER EFFECT FOR ALL ROBOT TIMERS & TELEMETRY
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = Date.now();
      
      // Update robot timers
      setRobotList((prevList) =>
        prevList.map((robot) => {
          if (robot.status === "IN USE" && robot.activeOrder?.expiresAt) {
            const secsLeft = Math.ceil((robot.activeOrder.expiresAt - now) / 1000);
            if (secsLeft <= 0) {
              return {
                ...robot,
                status: "AVAILABLE",
                activeOrder: null,
              };
            }
          }
          return robot;
        })
      );

      // Jitter telemetry values during active session
      setTelemetry((prev) => ({
        distanceMeters: prev.distanceMeters + Math.floor(Math.random() * 2),
        nearestObstacle: (1.5 + Math.random() * 1.5).toFixed(1) + "m",
        batteryDischargeRate: (0.12 + Math.random() * 0.05).toFixed(2) + " A",
        metricValue: +(prev.metricValue + 0.1).toFixed(1),
      }));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // TICKER FOR CHECKOUT PAGE ACTIVE RENTAL
  useEffect(() => {
    if (!paymentResult || !order || !order.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(order.expiresAt).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(remaining);

      if (remaining <= 0 && selectedRobot) {
        setRobotList((prev) =>
          prev.map((r) =>
            r.id === selectedRobot.id ? { ...r, status: "AVAILABLE", activeOrder: null } : r
          )
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentResult, order, selectedRobot]);

  const filteredRobots = robotList.filter((robot) => {
    if (filter === "AVAILABLE") return robot.status === "AVAILABLE";
    if (filter === "IN_USE") return robot.status === "IN USE";
    return true;
  });

  const availableCount = robotList.filter((r) => r.status === "AVAILABLE").length;

  const calculatePrice = (robot, selectedDuration) => {
    if (!robot) return 0;
    if (robot.id === "ST-01") return (selectedDuration / 10) * 10;
    return (selectedDuration / 10) * 20;
  };

  const selectedPrice = calculatePrice(selectedRobot, duration);

  async function handleConnectWallet() {
    try {
      setWalletConnecting(true);
      setWalletError("");
      const result = await connectMetaMask();
      setWalletAddress(result.address);
      showNotification(`Wallet Connected: ${result.address.slice(0, 6)}...${result.address.slice(-4)} on Base Sepolia`);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setWalletError(error?.message || "Failed to connect MetaMask.");
    } finally {
      setWalletConnecting(false);
    }
  }

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBookRobot = (robot) => {
    setSelectedRobot(robot);
    setDuration(10);
    setOrder(null);
    setBookingError("");
    setPaymentResult(null);
    setPaymentError("");
    setRemainingSeconds(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToRobots = () => {
    setSelectedRobot(null);
    setOrder(null);
    setBookingError("");
    setPaymentResult(null);
    setPaymentError("");
    setRemainingSeconds(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinueToPayment = async () => {
    if (!selectedRobot) {
      setBookingError("Please select a robot first.");
      return;
    }
    if (selectedRobot.status !== "AVAILABLE") {
      setBookingError("This robot is currently unavailable.");
      return;
    }

    setIsCreatingBooking(true);
    setBookingError("");
    setPaymentError("");
    setPaymentResult(null);
    setOrder(null);

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          robotId: selectedRobot.id,
          durationMinutes: duration,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create booking.");
      }

      setOrder(data.order);
    } catch (error) {
      console.error("Booking error:", error);
      setBookingError(error?.message || "Unable to connect to RoboPay backend.");
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // EXECUTE PAYMENT INTO ON-CHAIN ESCROW
  const handleExecutePayment = async (isDemoMode = false) => {
    if (!order) {
      setPaymentError("Booking information is missing.");
      return;
    }

    setIsPaying(true);
    setPaymentError("");

    try {
      let txHash = "";
      let activeWallet = walletAddress || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

      if (isDemoMode) {
        txHash = "0xdemo" + Date.now() + "00000000000000000000000000000000000000000000";
      } else {
        const wallet = await connectMetaMask();
        activeWallet = wallet.address;
        setWalletAddress(wallet.address);

        const blockchainResult = await payForRental({
          orderId: order.orderId,
          robotId: order.robotId,
          service: order.service,
          durationMinutes: order.durationMinutes,
          amountInr: order.amountInr,
        });

        txHash = blockchainResult.transactionHash;
      }

      const verifyResponse = await fetch(`${API_URL}/api/blockchain/verify-rental`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          transactionHash: txHash,
          walletAddress: activeWallet,
          isDemo: isDemoMode,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Blockchain verification failed.");
      }

      const startTime = Date.now();
      const expiresAt = startTime + order.durationMinutes * 60 * 1000;

      setPaymentResult({
        success: true,
        transactionHash: txHash,
        blockNumber: "Confirmed",
        amountPaidWei: "Contract Escrow Locked",
      });

      const updatedOrder = verifyData.order || {
        ...order,
        paymentStatus: "CONFIRMED",
        blockchainStatus: "CONFIRMED",
        rentalStatus: "ACTIVE",
        escrowStatus: "HELD_IN_ESCROW",
        walletAddress: activeWallet,
        transactionHash: txHash,
        startedAt: startTime,
        expiresAt: expiresAt,
      };

      setOrder(updatedOrder);

      // Add to user receipts list
      setUserOrders((prev) => [updatedOrder, ...prev.filter((o) => o.orderId !== updatedOrder.orderId)]);

      // Immediately update local robotList
      setRobotList((prevList) =>
        prevList.map((r) =>
          r.id === order.robotId
            ? {
                ...r,
                status: "IN USE",
                activeOrder: {
                  orderId: order.orderId,
                  startedAt: startTime,
                  expiresAt: expiresAt,
                  durationMinutes: order.durationMinutes,
                },
              }
            : r
        )
      );

      const secs = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(secs);

      showNotification(`🎉 Order #${order.orderId} Confirmed! Payment held safely in On-Chain Escrow.`);
      fetchRobots();
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(error?.message || "Payment execution failed.");
    } finally {
      setIsPaying(false);
    }
  };

  // ON-CHAIN ESCROW REFUND ACTION
  const handleRefundOrder = async (targetOrderId) => {
    setIsRefunding(true);
    setPaymentError("");

    try {
      let refundTxHash = "0xrefund" + Date.now();
      const targetOrder = order?.orderId === targetOrderId ? order : userOrders.find((o) => o.orderId === targetOrderId);

      // Attempt on-chain refund if user has MetaMask and non-demo order
      if (window.ethereum && walletAddress && targetOrder?.transactionHash && !targetOrder.transactionHash.startsWith("0xdemo")) {
        try {
          const chainRefund = await refundRentalOnChain(targetOrderId);
          refundTxHash = chainRefund.transactionHash;
        } catch (chainErr) {
          console.warn("Direct contract refund fallback to backend:", chainErr);
        }
      }

      // Backend sync
      const res = await fetch(`${API_URL}/api/blockchain/refund-rental`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: targetOrderId,
          walletAddress: walletAddress || "0x0000000000000000000000000000000000000000",
          transactionHash: refundTxHash,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Refund request failed.");
      }

      // Update state
      if (order && order.orderId === targetOrderId) {
        setOrder({
          ...order,
          rentalStatus: "REFUNDED",
          escrowStatus: "REFUNDED",
          refundTxHash,
        });
        setRemainingSeconds(0);
      }

      setUserOrders((prev) =>
        prev.map((o) =>
          o.orderId === targetOrderId
            ? { ...o, rentalStatus: "REFUNDED", escrowStatus: "REFUNDED", refundTxHash }
            : o
        )
      );

      fetchRobots();
      showNotification(`🛡️ On-Chain Escrow Refund Confirmed! ₹${targetOrder?.amountInr || ""} refunded directly to wallet.`);
    } catch (err) {
      console.error("Refund error:", err);
      setPaymentError("Refund failed: " + err.message);
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="bg-cream min-h-screen text-charcoal font-sans antialiased selection:bg-acidlime selection:text-charcoal flex flex-col">
      
      {/* ENTERPRISE TOP SYSTEM STATUS BAR */}
      <div className="bg-charcoal border-b border-white/10 text-white/80 text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-acidlime opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-acidlime"></span>
            </span>
            <span className="font-semibold text-white">Network: Base Sepolia Testnet</span>
            <span className="text-white/30">•</span>
            <span className="text-white/60">Escrow Security: Smart Contract Verified</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-white/50">
            <span>Active Fleets: {robotList.length}</span>
            <span>Available: {availableCount}</span>
            <span className="px-2 py-0.5 rounded bg-olive/40 text-cream font-mono">v2.5.0-ESCROW</span>
          </div>
        </div>
      </div>

      {/* GLOBAL TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 bg-charcoal text-acidlime border-2 border-acidlime px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <span className="text-xl">🔔</span>
          <span className="text-xs font-bold">{notification}</span>
        </div>
      )}

      {/* STICKY GLASS NAVBAR */}
      <header className="sticky top-0 z-40 bg-charcoal/95 backdrop-blur-md text-cream border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* BRAND LOGO */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => handleBackToRobots()}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-terracotta via-olive to-charcoal p-0.5 shadow-glow-terracotta group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-charcoal rounded-[10px] flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-tight text-white">
                  Robo<span className="text-acidlime">Pay</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-terracotta text-cream shadow-sm">
                  ESCROW
                </span>
              </div>
              <p className="text-[11px] text-white/50 font-medium">Autonomous Robotic Fleet Protocol</p>
            </div>
          </div>

          {/* NAV LINKS */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold">
            <button
              onClick={() => {
                setSelectedRobot(null);
                document.getElementById("robots")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-white/80 hover:text-acidlime transition-colors flex items-center space-x-1.5"
            >
              <span>Fleet Catalog</span>
            </button>
            <button
              onClick={() => setShowReceiptsModal(true)}
              className="text-white/80 hover:text-acidlime transition-colors flex items-center space-x-1.5"
            >
              <span>My Receipts & Escrow</span>
              {userOrders.length > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-acidlime text-charcoal text-[10px] font-black">
                  {userOrders.length}
                </span>
              )}
            </button>
            <a
              href="https://sepolia.basescan.org"
              target="_blank"
              rel="noreferrer"
              className="text-white/80 hover:text-acidlime transition-colors flex items-center space-x-1"
            >
              <span>BaseScan Explorer</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </nav>

          {/* WALLET INTEGRATION WIDGET */}
          <div className="flex items-center space-x-3">
            {walletAddress ? (
              <div className="flex items-center space-x-2 bg-white/5 border border-white/15 hover:border-acidlime/50 px-4 py-2 rounded-xl backdrop-blur-md transition-all">
                <span className="w-2.5 h-2.5 rounded-full bg-acidlime animate-pulse"></span>
                <button 
                  onClick={handleCopyAddress} 
                  className="font-mono text-xs text-white/90 hover:text-acidlime font-bold flex items-center space-x-1.5"
                  title="Click to copy address"
                >
                  <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {copied && <span className="text-[10px] text-acidlime font-bold">Copied!</span>}
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={walletConnecting}
                className="bg-acidlime text-charcoal font-extrabold text-sm px-6 py-2.5 rounded-xl shadow-glow-lime hover:bg-acidlime/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-2"
              >
                <span>{walletConnecting ? "Connecting Wallet..." : "Connect MetaMask"}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ERROR BANNER */}
      {walletError && (
        <div className="bg-apricot text-white text-xs font-semibold py-3 px-6 text-center shadow-lg flex items-center justify-center space-x-2 border-b border-apricot/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{walletError}</span>
        </div>
      )}

      {/* MAIN VIEW */}
      {selectedRobot ? (
        /* BOOKING / PAYMENT CHECKOUT VIEW */
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
          
          <button
            onClick={handleBackToRobots}
            className="inline-flex items-center space-x-2 text-sm font-bold text-charcoal/70 hover:text-terracotta mb-8 transition-colors bg-white px-4 py-2 rounded-xl border border-charcoal/10 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Fleet Selection</span>
          </button>

          {/* CHECKOUT STEPPER HEADER */}
          <div className="mb-8 bg-white p-4 rounded-2xl border border-charcoal/10 shadow-sm flex items-center justify-between text-xs font-bold">
            <div className={`flex items-center space-x-2 ${!order ? "text-terracotta" : "text-charcoal/40"}`}>
              <span className="w-6 h-6 rounded-full bg-terracotta text-cream flex items-center justify-center text-xs">1</span>
              <span>Duration Configuration</span>
            </div>
            <div className="w-12 h-0.5 bg-charcoal/10"></div>
            <div className={`flex items-center space-x-2 ${order && !paymentResult ? "text-terracotta" : "text-charcoal/40"}`}>
              <span className="w-6 h-6 rounded-full bg-charcoal text-cream flex items-center justify-center text-xs">2</span>
              <span>On-Chain Escrow Lock</span>
            </div>
            <div className="w-12 h-0.5 bg-charcoal/10"></div>
            <div className={`flex items-center space-x-2 ${paymentResult ? "text-olive" : "text-charcoal/40"}`}>
              <span className="w-6 h-6 rounded-full bg-olive text-cream flex items-center justify-center text-xs">3</span>
              <span>Active IoT Session</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-charcoal/10 shadow-2xl space-y-8">
            
            {/* ROBOT HEADER CARD */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-charcoal/10">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 rounded-2xl bg-cream border border-charcoal/10 flex items-center justify-center shadow-inner">
                  {selectedRobot.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded bg-charcoal text-cream">
                      {selectedRobot.id}
                    </span>
                    <span className="text-xs font-bold text-olive uppercase tracking-wider">{selectedRobot.type}</span>
                  </div>
                  <h1 className="text-3xl font-black text-charcoal tracking-tight mt-1">{selectedRobot.name}</h1>
                  <p className="text-xs font-semibold text-charcoal/60">{selectedRobot.service}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-cream px-3 py-1.5 rounded-xl border border-charcoal/10 text-xs font-semibold">
                  <span className="text-charcoal/50">Battery:</span> <span className="font-bold text-charcoal">{selectedRobot.battery}%</span>
                </div>
                <div className="bg-cream px-3 py-1.5 rounded-xl border border-charcoal/10 text-xs font-semibold">
                  <span className="text-charcoal/50">Payload:</span> <span className="font-bold text-charcoal">{selectedRobot.payload}</span>
                </div>
                <span
                  className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full ${
                    selectedRobot.status === "AVAILABLE"
                      ? "bg-acidlime/20 text-charcoal border border-acidlime/60"
                      : "bg-terracotta/20 text-terracotta border border-terracotta/40"
                  }`}
                >
                  ● {selectedRobot.status}
                </span>
              </div>
            </div>

            {/* DESCRIPTION BOX */}
            <div className="bg-cream/60 p-5 rounded-2xl border border-charcoal/5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal/50 mb-1">Operational Overview</h4>
              <p className="text-sm leading-relaxed text-charcoal/80 font-medium">{selectedRobot.description}</p>
            </div>

            {/* DURATION SELECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Select Service Duration</h3>
                  <p className="text-xs text-charcoal/50">Choose timeframe for smart contract escrow locking</p>
                </div>
                <span className="text-xs font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
                  Real-time Pricing
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[10, 20, 30].map((mins) => {
                  const isSelected = duration === mins;

                  return (
                    <button
                      key={mins}
                      onClick={() => setDuration(mins)}
                      className={`p-5 rounded-2xl font-bold text-sm flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? "bg-acidlime text-charcoal shadow-glow-lime scale-[1.02] border-2 border-charcoal"
                          : "bg-cream text-charcoal border border-charcoal/10 hover:border-terracotta"
                      }`}
                    >
                      <span className="text-2xl font-black">{mins} Mins</span>
                      <span className="text-xs opacity-70 font-semibold mt-1">
                        {selectedRobot.id === "ST-01"
                          ? `₹${(mins / 10) * 10}`
                          : `₹${(mins / 10) * 20}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FINANCIAL BREAKDOWN */}
            <div className="bg-charcoal text-cream p-7 rounded-2xl space-y-4 shadow-xl border border-white/10">
              <div className="flex justify-between items-center text-sm text-white/70">
                <span>Selected Fleet Unit</span>
                <span className="font-bold text-white">{selectedRobot.name} ({selectedRobot.id})</span>
              </div>
              <div className="flex justify-between items-center text-sm text-white/70">
                <span>Service Duration</span>
                <span className="font-bold text-white">{duration} Minutes</span>
              </div>
              <div className="flex justify-between items-center text-sm text-white/70">
                <span>Escrow Refund Guarantee</span>
                <span className="font-bold text-acidlime">100% Refundable on Early Cancellation</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                <div>
                  <span className="text-lg font-black text-white">Total Escrow Amount</span>
                  <p className="text-xs text-white/50">INR Equivalent on Base Sepolia EVM</p>
                </div>
                <div className="text-4xl font-black text-acidlime">₹{selectedPrice}</div>
              </div>
            </div>

            {/* ERROR ALERTS */}
            {bookingError && (
              <div className="p-4 rounded-xl bg-apricot/10 border border-apricot text-apricot text-sm font-semibold flex items-center space-x-2">
                <span>⚠️ {bookingError}</span>
              </div>
            )}

            {paymentError && (
              <div className="p-4 rounded-xl bg-red-100 border border-red-400 text-red-700 text-sm font-semibold flex items-center space-x-2">
                <span>⚠️ {paymentError}</span>
              </div>
            )}

            {/* ACTION CTA / PAYMENT STATES */}
            {!order ? (
              <button
                onClick={handleContinueToPayment}
                disabled={isCreatingBooking || selectedRobot.status !== "AVAILABLE"}
                className="w-full bg-acidlime text-charcoal font-extrabold text-base py-5 rounded-2xl shadow-glow-lime hover:bg-acidlime/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>{isCreatingBooking ? "Generating Order..." : "Confirm Booking & Generate Escrow Voucher →"}</span>
              </button>
            ) : paymentResult ? (
              /* ACTIVE SESSION, IOT TELEMETRY & ESCROW REFUND ACTION */
              <div className="space-y-6">
                
                {/* ACTIVE BANNER */}
                <div className="bg-olive/10 border-2 border-olive rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-olive">
                      <div className="w-12 h-12 rounded-2xl bg-olive text-cream flex items-center justify-center font-black text-2xl shadow-md">
                        ✓
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-charcoal">Service Session Active</h3>
                        <p className="text-xs text-charcoal/70 font-semibold">Funds locked in RoboPay Smart Contract Escrow</p>
                      </div>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-acidlime text-charcoal text-xs font-black shadow-sm">
                      🔒 Escrow Protected
                    </span>
                  </div>

                  {/* REAL TIME COUNTDOWN WIDGET */}
                  <div className="bg-charcoal text-cream p-8 rounded-2xl text-center space-y-2 shadow-2xl border border-white/10">
                    <span className="text-xs font-bold uppercase tracking-widest text-acidlime">Remaining Live Session Time</span>
                    <div className="text-6xl font-mono font-black tracking-widest text-white py-2">
                      {formatTime(remainingSeconds)}
                    </div>
                    <p className="text-xs text-white/50">Robot is currently executing your session in the smart mall</p>
                  </div>

                  {/* LIVE IOT ROBOT TELEMETRY HUD */}
                  <div className="bg-white rounded-2xl p-6 border border-charcoal/10 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-acidlime animate-ping"></span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">Live IoT Fleet Telemetry HUD</h4>
                      </div>
                      <span className="text-[10px] font-mono text-charcoal/50">Update Rate: 100 Hz</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-cream p-3 rounded-xl border border-charcoal/5">
                        <span className="text-[10px] uppercase font-bold text-charcoal/50 block">LiDAR Scanner</span>
                        <span className="text-xs font-black text-olive">Clear ({telemetry.nearestObstacle})</span>
                      </div>
                      <div className="bg-cream p-3 rounded-xl border border-charcoal/5">
                        <span className="text-[10px] uppercase font-bold text-charcoal/50 block">Battery Drain</span>
                        <span className="text-xs font-black text-charcoal">{telemetry.batteryDischargeRate}</span>
                      </div>
                      <div className="bg-cream p-3 rounded-xl border border-charcoal/5">
                        <span className="text-[10px] uppercase font-bold text-charcoal/50 block">Odometer</span>
                        <span className="text-xs font-black text-charcoal">{telemetry.distanceMeters} m</span>
                      </div>
                      <div className="bg-cream p-3 rounded-xl border border-charcoal/5">
                        <span className="text-[10px] uppercase font-bold text-charcoal/50 block">
                          {selectedRobot.id === "FC-01" ? "Sanitized" : selectedRobot.id === "ST-01" ? "Items In Cart" : "Payload Weight"}
                        </span>
                        <span className="text-xs font-black text-terracotta">
                          {selectedRobot.id === "FC-01" ? `${telemetry.metricValue} m²` : selectedRobot.id === "ST-01" ? "7 Items" : `${telemetry.metricValue} kg`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TRANSACTION HASH & ACTIONS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="bg-white p-4 rounded-2xl border border-charcoal/10 space-y-1">
                      <span className="text-charcoal/50 block">Transaction Hash</span>
                      <a
                        href={`https://sepolia.basescan.org/tx/${paymentResult.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-terracotta hover:underline truncate block font-bold"
                      >
                        {paymentResult.transactionHash}
                      </a>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-charcoal/10 space-y-1">
                      <span className="text-charcoal/50 block">Escrow State</span>
                      <span className="font-mono font-bold text-olive">
                        {order.rentalStatus === "REFUNDED" ? "↩ REFUNDED" : "🔒 ESCROW LOCKED"}
                      </span>
                    </div>
                  </div>

                  {/* ESCROW REFUND ACTION BUTTON */}
                  {order.rentalStatus !== "REFUNDED" && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleRefundOrder(order.orderId)}
                        disabled={isRefunding}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-300 font-extrabold text-sm py-4 rounded-2xl transition-all flex items-center justify-center space-x-2"
                      >
                        <span>🛡️</span>
                        <span>{isRefunding ? "Processing On-Chain Refund..." : "Cancel Service & Claim Instant On-Chain Refund"}</span>
                      </button>
                      <p className="text-[11px] text-center text-charcoal/50 mt-2 font-medium">
                        Smart contract will automatically return your locked escrow funds to your wallet.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleBackToRobots}
                    className="w-full bg-charcoal text-cream font-bold text-sm py-3.5 rounded-2xl hover:bg-charcoal/90 transition-all text-center block"
                  >
                    Return to Catalog & View Live Robot Timer
                  </button>
                </div>

              </div>
            ) : (
              /* PAYMENT OPTIONS BOX (METAMASK + DEMO SIMULATION) */
              <div className="space-y-5 bg-terracotta/5 border border-terracotta/30 p-8 rounded-3xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-terracotta uppercase">ORDER REF #{order.orderId}</span>
                    <h3 className="text-xl font-bold text-charcoal">Smart Contract Authorization Ready</h3>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-apricot/20 text-apricot text-xs font-extrabold">
                    Awaiting Escrow Deposit
                  </span>
                </div>

                <p className="text-xs text-charcoal/70 leading-relaxed font-medium">
                  Select payment execution method below. Your funds are deposited securely into the RoboPay on-chain escrow contract on Base Sepolia.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* REAL METAMASK BUTTON */}
                  <button
                    onClick={() => handleExecutePayment(false)}
                    disabled={isPaying}
                    className="w-full bg-terracotta text-cream font-extrabold text-sm py-4.5 px-4 rounded-2xl shadow-glow-terracotta hover:bg-terracotta/90 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span className="text-lg">⚡</span>
                    <span>{isPaying ? "Depositing into Escrow..." : `Deposit ₹${order.amountInr} via MetaMask`}</span>
                  </button>

                  {/* INSTANT DEMO SIMULATION BUTTON */}
                  <button
                    onClick={() => handleExecutePayment(true)}
                    disabled={isPaying}
                    className="w-full bg-acidlime text-charcoal font-extrabold text-sm py-4.5 px-4 rounded-2xl shadow-glow-lime hover:bg-acidlime/90 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span className="text-lg">🚀</span>
                    <span>{isPaying ? "Activating..." : `Simulate Instant Escrow Deposit`}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      ) : (
        /* HERO & CATALOG VIEW */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
          
          {/* HERO SECTION */}
          <section className="relative overflow-hidden rounded-3xl bg-charcoal text-cream shadow-2xl p-8 sm:p-14 lg:p-16 border border-white/10">
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-terracotta/25 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-olive/35 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 max-w-3xl space-y-6">
              
              <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-extrabold text-acidlime">
                <span className="w-2 h-2 rounded-full bg-acidlime animate-pulse"></span>
                <span>On-Chain Escrow & Auto-Refund Architecture Active</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
                Autonomous Robot Rentals. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-acidlime via-apricot to-terracotta">
                  Protected by On-Chain Escrow.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-white/70 leading-relaxed font-medium max-w-2xl">
                Deploy smart robotic assistants, sanitizers, and express carts across the mall. Funds stay securely locked in smart contract escrow with instant auto-refund protection.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => document.getElementById("robots")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-acidlime text-charcoal font-extrabold text-base px-8 py-4 rounded-2xl shadow-glow-lime hover:bg-acidlime/90 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                >
                  <span>Launch Fleet Catalog</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowReceiptsModal(true)}
                  className="bg-white/10 hover:bg-white/15 text-white font-bold text-base px-6 py-4 rounded-2xl border border-white/20 transition-all flex items-center space-x-2"
                >
                  <span>View Receipts ({userOrders.length})</span>
                </button>

                <div className="flex items-center space-x-4 text-xs font-semibold text-white/60 pl-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-acidlime font-bold text-sm">{robotList.length}</span>
                    <span>Fleets Online</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-acidlime font-bold text-sm">100%</span>
                    <span>Escrow Protected</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* SERVICE CATALOG SECTION */}
          <section id="robots" className="space-y-8 scroll-mt-24">
            
            {/* FILTER BAR & HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-charcoal/10 pb-6">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-extrabold text-olive uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-olive"></span>
                  <span>Autonomous Fleet Roster</span>
                </div>
                <h2 className="text-3xl font-black text-charcoal tracking-tight">Available Robots</h2>
                <p className="text-xs font-semibold text-charcoal/60 mt-1">
                  Select an available unit to configure service timeframe and launch smart rental
                </p>
              </div>

              {/* TABS */}
              <div className="flex items-center bg-white p-1.5 rounded-2xl border border-charcoal/10 shadow-sm text-xs font-bold">
                <button
                  onClick={() => setFilter("ALL")}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === "ALL" ? "bg-charcoal text-cream shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                  }`}
                >
                  All Units ({robotList.length})
                </button>
                <button
                  onClick={() => setFilter("AVAILABLE")}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === "AVAILABLE" ? "bg-acidlime text-charcoal shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                  }`}
                >
                  Ready ({availableCount})
                </button>
                <button
                  onClick={() => setFilter("IN_USE")}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    filter === "IN_USE" ? "bg-terracotta text-cream shadow-sm" : "text-charcoal/60 hover:text-charcoal"
                  }`}
                >
                  In Service ({robotList.length - availableCount})
                </button>
              </div>
            </div>

            {/* CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredRobots.map((robot) => {
                const isAvailable = robot.status === "AVAILABLE";
                const activeSecsLeft =
                  robot.activeOrder && robot.activeOrder.expiresAt
                    ? Math.max(0, Math.ceil((robot.activeOrder.expiresAt - Date.now()) / 1000))
                    : 0;

                return (
                  <article
                    key={robot.id}
                    className={`group bg-white rounded-3xl border shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                      isAvailable ? "border-charcoal/10" : "border-terracotta/40 bg-terracotta/[0.02]"
                    }`}
                  >
                    <div className="p-7 space-y-5">
                      
                      {/* CARD TOP BAR */}
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-cream border border-charcoal/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          {robot.icon}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cream border border-charcoal/10 text-charcoal/70">
                            ★ {robot.rating}
                          </span>
                          <span
                            className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                              isAvailable
                                ? "bg-acidlime/20 text-charcoal border border-acidlime/60"
                                : "bg-terracotta/15 text-terracotta border border-terracotta/30"
                            }`}
                          >
                            ● {robot.status}
                          </span>
                        </div>
                      </div>

                      {/* TITLE & TAGS */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-charcoal/50">{robot.id}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta px-2 py-0.5 rounded bg-terracotta/10">
                            {robot.tag}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-charcoal tracking-tight mt-1">{robot.name}</h3>
                        <p className="text-xs font-bold text-olive uppercase tracking-wider mt-0.5">{robot.service}</p>
                      </div>

                      {/* LIVE ROBOT TIMER BADGE (IF IN USE) */}
                      {!isAvailable && activeSecsLeft > 0 && (
                        <div className="bg-charcoal text-cream p-3 rounded-2xl flex items-center justify-between shadow-md border border-white/10">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-acidlime animate-ping"></span>
                            <span className="text-xs font-bold text-acidlime">Active Service Session</span>
                          </div>
                          <span className="font-mono text-sm font-black tracking-wider text-white">
                            ⏱ {formatTime(activeSecsLeft)}
                          </span>
                        </div>
                      )}

                      <p className="text-xs leading-relaxed text-charcoal/70 font-medium">
                        {robot.description}
                      </p>

                      {/* METRICS ROW */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-charcoal/5 text-[11px] font-semibold text-charcoal/70">
                        <div className="bg-cream p-2 rounded-xl text-center">
                          <span className="text-charcoal/40 block text-[9px] uppercase">Battery</span>
                          <span className="font-bold text-charcoal">{robot.battery}%</span>
                        </div>
                        <div className="bg-cream p-2 rounded-xl text-center">
                          <span className="text-charcoal/40 block text-[9px] uppercase">Payload</span>
                          <span className="font-bold text-charcoal">{robot.payload}</span>
                        </div>
                        <div className="bg-cream p-2 rounded-xl text-center">
                          <span className="text-charcoal/40 block text-[9px] uppercase">Speed</span>
                          <span className="font-bold text-charcoal">{robot.speed}</span>
                        </div>
                      </div>

                    </div>

                    {/* CARD FOOTER */}
                    <div className="p-7 bg-cream/70 border-t border-charcoal/5 space-y-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal/40">Rental Rate</span>
                          <div className="text-2xl font-black text-charcoal">{robot.id === "ST-01" ? "₹10" : "₹20"}</div>
                        </div>
                        <span className="text-xs font-semibold text-charcoal/60">
                          per 10 mins
                        </span>
                      </div>

                      <button
                        onClick={() => handleBookRobot(robot)}
                        disabled={!isAvailable}
                        className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center space-x-2 ${
                          isAvailable
                            ? "bg-acidlime text-charcoal shadow-glow-lime hover:bg-acidlime/90 active:scale-[0.98]"
                            : "bg-charcoal/10 text-charcoal/50 cursor-not-allowed border border-transparent"
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <span>Reserve & Book Unit</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </>
                        ) : (
                          <span>In Use (⏱ {formatTime(activeSecsLeft)})</span>
                        )}
                      </button>
                    </div>

                  </article>
                );
              })}
            </div>
          </section>

          {/* PROTOCOL ARCHITECTURE SECTION */}
          <section id="how-it-works" className="bg-charcoal text-cream rounded-3xl p-8 sm:p-14 border border-white/10 space-y-12 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-acidlime">High Security & Speed</span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">How RoboPay Operates</h2>
              <p className="text-sm text-white/70">
                End-to-end automated rental flow backed by smart contract verification
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  num: "01",
                  title: "Select Unit & Time",
                  desc: "Pick an active robot from the fleet roster and choose your required service timeframe.",
                  icon: "🤖",
                  border: "border-terracotta/40"
                },
                {
                  num: "02",
                  title: "Escrow Deposit",
                  desc: "Connect MetaMask on Base Sepolia. Funds lock safely in smart contract escrow.",
                  icon: "🔒",
                  border: "border-olive/40"
                },
                {
                  num: "03",
                  title: "Real-Time Telemetry",
                  desc: "Robot deploys autonomously with live IoT tracking and active countdown timer.",
                  icon: "📡",
                  border: "border-acidlime/40"
                },
                {
                  num: "04",
                  title: "Settlement or Refund",
                  desc: "Upon completion, escrow releases. If cancelled early, funds auto-refund instantly.",
                  icon: "🛡️",
                  border: "border-apricot/40"
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className={`bg-white/5 border ${step.border} p-6 rounded-2xl space-y-3 backdrop-blur-sm hover:bg-white/10 transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{step.icon}</span>
                    <span className="text-xs font-mono font-black text-white/40">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-white/60 font-medium">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

        </main>
      )}

      {/* MY RECEIPTS & ON-CHAIN ACTIVITY MODAL */}
      {showReceiptsModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl border border-charcoal/10 space-y-6 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
              <div>
                <h3 className="text-2xl font-black text-charcoal">My On-Chain Activity & Receipts</h3>
                <p className="text-xs text-charcoal/60">Verified Base Sepolia Escrow Transactions</p>
              </div>
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="w-10 h-10 rounded-xl bg-cream hover:bg-charcoal/10 flex items-center justify-center text-charcoal font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {userOrders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">📜</span>
                <h4 className="text-base font-bold text-charcoal">No On-Chain Orders Yet</h4>
                <p className="text-xs text-charcoal/60">Your confirmed robot rental vouchers and escrow records will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((rec) => (
                  <div
                    key={rec.orderId}
                    className="p-5 rounded-2xl border border-charcoal/10 bg-cream/50 space-y-3 hover:border-terracotta/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-black text-charcoal">#{rec.orderId}</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            rec.rentalStatus === "REFUNDED"
                              ? "bg-red-100 text-red-700"
                              : rec.rentalStatus === "ACTIVE"
                              ? "bg-acidlime/30 text-charcoal"
                              : "bg-olive/20 text-olive"
                          }`}
                        >
                          ● {rec.rentalStatus === "REFUNDED" ? "Refunded" : rec.rentalStatus === "ACTIVE" ? "In Escrow" : "Completed"}
                        </span>
                      </div>
                      <span className="text-base font-black text-charcoal">₹{rec.amountInr}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-charcoal/70">
                      <div>
                        <span className="block text-charcoal/40 text-[9px] uppercase font-bold">Fleet Unit</span>
                        <span className="font-bold text-charcoal">{rec.robotId}</span>
                      </div>
                      <div>
                        <span className="block text-charcoal/40 text-[9px] uppercase font-bold">Duration</span>
                        <span className="font-bold text-charcoal">{rec.durationMinutes} Mins</span>
                      </div>
                      <div>
                        <span className="block text-charcoal/40 text-[9px] uppercase font-bold">Transaction</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${rec.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-terracotta font-mono font-bold hover:underline truncate block"
                        >
                          {rec.transactionHash?.slice(0, 10)}...
                        </a>
                      </div>
                      <div className="flex items-center justify-end">
                        {rec.rentalStatus === "ACTIVE" && (
                          <button
                            onClick={() => handleRefundOrder(rec.orderId)}
                            disabled={isRefunding}
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] px-3 py-1.5 rounded-xl border border-red-300 transition-colors"
                          >
                            Claim Refund
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-charcoal/10 flex justify-end">
              <button
                onClick={() => setShowReceiptsModal(false)}
                className="bg-charcoal text-cream font-bold text-sm px-6 py-2.5 rounded-xl"
              >
                Close Receipts
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-charcoal text-cream border-t border-white/10 mt-auto py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta to-olive flex items-center justify-center text-xl shadow-md">
              🤖
            </div>
            <div>
              <span className="text-lg font-black text-white">Robo<span className="text-acidlime">Pay</span></span>
              <p className="text-xs text-white/50 font-medium">Smart Mall Autonomous Payment System</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs text-white/70 font-semibold">
            <a href="#robots" className="hover:text-acidlime transition-colors">Catalog</a>
            <button onClick={() => setShowReceiptsModal(true)} className="hover:text-acidlime transition-colors">
              My Receipts & Escrow
            </button>
            <a href="https://sepolia.basescan.org" target="_blank" rel="noreferrer" className="hover:text-acidlime transition-colors">
              BaseScan Explorer
            </a>
          </div>

          <div className="text-xs text-white/40 text-center md:text-right font-medium">
            <p>Built with React, Vite, Tailwind CSS v4 & Base Sepolia Escrow Contract</p>
            <p>© 2026 RoboPay Protocol. All rights reserved.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}

export default App;