import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

const robots = [
    {
        id: "RF-01",
        name: "RoboFollow",
        service: "Human Following",
        description: "Personal robotic assistant for guided movement and carrying.",
        priceText: "₹20 / 10 min",
        pricePer10Min: 20,
        status: "AVAILABLE",
    },
    {
        id: "FC-01",
        name: "RoboClean",
        service: "Floor Cleaning",
        description: "Autonomous floor-cleaning service for mall visitors and areas.",
        priceText: "₹20 / 10 min",
        pricePer10Min: 20,
        status: "IN USE",
    },
    {
        id: "ST-01",
        name: "RoboTrolley",
        service: "Smart Shopping Trolley",
        description: "Smart robotic trolley designed to assist customers while shopping.",
        priceText: "₹30 / 30 min",
        pricePer30Min: 30,
        status: "AVAILABLE",
    },
];

function App() {
    const [selectedRobot, setSelectedRobot] = useState(null);
    const [duration, setDuration] = useState(10);

    const [order, setOrder] = useState(null);
    const [isCreatingBooking, setIsCreatingBooking] = useState(false);
    const [bookingError, setBookingError] = useState("");

    const availableCount = robots.filter(
        (robot) => robot.status === "AVAILABLE"
    ).length;

    const calculatePrice = (robot, selectedDuration) => {
        if (!robot) return 0;

        if (robot.id === "ST-01") {
            return 30;
        }

        return (selectedDuration / 10) * 20;
    };

    const selectedPrice = calculatePrice(
        selectedRobot,
        duration
    );

    const handleBookRobot = (robot) => {
        setSelectedRobot(robot);
        setDuration(robot.id === "ST-01" ? 30 : 10);
        setOrder(null);
        setBookingError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleBackToRobots = () => {
        setSelectedRobot(null);
        setOrder(null);
        setBookingError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
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
        setOrder(null);

        try {
            const response = await fetch(
                `${API_URL}/api/bookings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        robotId: selectedRobot.id,
                        durationMinutes: duration,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "Failed to create booking."
                );
            }

            console.log(
                "RoboPay booking created:",
                data.order
            );

            setOrder(data.order);

        } catch (error) {
            console.error("Booking error:", error);

            setBookingError(
                error.message ||
                "Unable to connect to RoboPay backend."
            );
        } finally {
            setIsCreatingBooking(false);
        }
    };

    return (
        <div className="app">

            {/* NAVBAR */}
            <header className="navbar">
                <div className="brand">
                    <div className="brand-icon">🤖</div>

                    <div>
                        <h2>RoboPay</h2>
                        <p>Smart Mall</p>
                    </div>
                </div>

                <nav className="nav-links">
                    <button
                        onClick={() => {
                            setSelectedRobot(null);
                            document
                                .getElementById("robots")
                                ?.scrollIntoView({
                                    behavior: "smooth",
                                });
                        }}
                    >
                        Robots
                    </button>

                    <button
                        onClick={() => {
                            setSelectedRobot(null);
                            document
                                .getElementById("how-it-works")
                                ?.scrollIntoView({
                                    behavior: "smooth",
                                });
                        }}
                    >
                        How It Works
                    </button>

                    <button className="wallet-btn">
                        Connect Wallet
                    </button>
                </nav>
            </header>

            {/* BOOKING PAGE */}
            {selectedRobot ? (
                <main className="booking-page">

                    <button
                        className="back-btn"
                        onClick={handleBackToRobots}
                    >
                        ← Back to Robots
                    </button>

                    <section className="booking-card">

                        <div className="booking-header">
                            <div>
                                <span className="robot-id">
                                    {selectedRobot.id}
                                </span>

                                <h1>
                                    {selectedRobot.name}
                                </h1>

                                <p>
                                    {selectedRobot.service}
                                </p>
                            </div>

                            <span
                                className={
                                    selectedRobot.status ===
                                    "AVAILABLE"
                                        ? "status available"
                                        : "status in-use"
                                }
                            >
                                {selectedRobot.status}
                            </span>
                        </div>

                        <div className="booking-description">
                            {selectedRobot.description}
                        </div>

                        {/* DURATION */}
                        <div className="booking-section">
                            <h3>Select Duration</h3>

                            <div className="duration-options">

                                {[10, 20, 30].map(
                                    (minutes) => (
                                        <button
                                            key={minutes}
                                            className={
                                                duration ===
                                                minutes
                                                    ? "duration-btn active"
                                                    : "duration-btn"
                                            }
                                            onClick={() =>
                                                setDuration(
                                                    minutes
                                                )
                                            }
                                            disabled={
                                                selectedRobot.id ===
                                                    "ST-01" &&
                                                minutes !== 30
                                            }
                                        >
                                            {minutes} min
                                        </button>
                                    )
                                )}

                            </div>
                        </div>

                        {/* PRICE */}
                        <div className="price-summary">

                            <div className="price-row">
                                <span>Robot</span>

                                <strong>
                                    {selectedRobot.name}
                                </strong>
                            </div>

                            <div className="price-row">
                                <span>Duration</span>

                                <strong>
                                    {duration} minutes
                                </strong>
                            </div>

                            <div className="price-row total-row">
                                <span>Total</span>

                                <strong>
                                    ₹{selectedPrice}
                                </strong>
                            </div>

                        </div>

                        {/* ERROR */}
                        {bookingError && (
                            <div className="booking-error">
                                {bookingError}
                            </div>
                        )}

                        {/* ORDER CREATED */}
                        {order ? (
                            <div className="order-success">

                                <div className="success-icon">
                                    ✓
                                </div>

                                <h2>
                                    Booking Created Successfully
                                </h2>

                                <p>
                                    Your RoboPay order has been
                                    created.
                                </p>

                                <div className="order-details">

                                    <div>
                                        <span>Order ID</span>
                                        <strong>
                                            {order.orderId}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Robot</span>
                                        <strong>
                                            {order.robotName}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Duration</span>
                                        <strong>
                                            {
                                                order.durationMinutes
                                            }{" "}
                                            minutes
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Amount</span>
                                        <strong>
                                            ₹{order.amountInr}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Payment</span>
                                        <strong>
                                            {order.paymentStatus}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Blockchain</span>
                                        <strong>
                                            {
                                                order.blockchainStatus
                                            }
                                        </strong>
                                    </div>

                                </div>

                                <div className="payment-placeholder">
                                    <h3>
                                        Payment
                                    </h3>

                                    <p>
                                        Your order is ready.
                                        Real UPI payment
                                        integration will be
                                        connected in the next step.
                                    </p>

                                    <div className="payment-amount">
                                        ₹{order.amountInr}
                                    </div>

                                    <div className="secure-text">
                                        🔒 Secure payment •
                                        Blockchain verified
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <button
                                className="payment-btn"
                                onClick={
                                    handleContinueToPayment
                                }
                                disabled={
                                    isCreatingBooking ||
                                    selectedRobot.status !==
                                        "AVAILABLE"
                                }
                            >
                                {isCreatingBooking
                                    ? "Creating Booking..."
                                    : "Continue to Payment →"}
                            </button>
                        )}

                        <div className="secure-text">
                            🔒 Secure payment • Blockchain verified
                        </div>

                    </section>
                </main>
            ) : (
                <>
                    {/* HERO */}
                    <main>

                        <section className="hero">

                            <div className="hero-content">

                                <div className="hero-badge">
                                    ⛓ Blockchain Enabled
                                </div>

                                <h1>
                                    Smart robots.
                                    <br />
                                    Pay as you use.
                                </h1>

                                <p>
                                    Rent robotic services across
                                    the smart mall and pay only for
                                    the time you use.
                                </p>

                                <button
                                    className="hero-btn"
                                    onClick={() =>
                                        document
                                            .getElementById(
                                                "robots"
                                            )
                                            ?.scrollIntoView({
                                                behavior:
                                                    "smooth",
                                            })
                                    }
                                >
                                    Explore Robots →
                                </button>

                            </div>

                        </section>

                        {/* ROBOTS */}
                        <section
                            id="robots"
                            className="robots-section"
                        >

                            <div className="section-heading">

                                <div>
                                    <span className="section-label">
                                        AVAILABLE SERVICES
                                    </span>

                                    <h2>
                                        Choose your robot
                                    </h2>

                                    <p>
                                        Scan, book and pay for
                                        robotic services directly
                                        from your phone.
                                    </p>
                                </div>

                                <div className="available-count">
                                    <strong>
                                        {availableCount}
                                    </strong>

                                    <span>
                                        robots available
                                    </span>
                                </div>

                            </div>

                            <div className="robot-grid">

                                {robots.map(
                                    (robot) => (
                                        <article
                                            className="robot-card"
                                            key={robot.id}
                                        >

                                            <div className="robot-card-top">

                                                <div className="robot-icon">
                                                    🤖
                                                </div>

                                                <span
                                                    className={
                                                        robot.status ===
                                                        "AVAILABLE"
                                                            ? "status available"
                                                            : "status in-use"
                                                    }
                                                >
                                                    {robot.status}
                                                </span>

                                            </div>

                                            <span className="robot-id">
                                                {robot.id}
                                            </span>

                                            <h3>
                                                {robot.name}
                                            </h3>

                                            <p className="robot-service">
                                                {robot.service}
                                            </p>

                                            <p className="robot-description">
                                                {
                                                    robot.description
                                                }
                                            </p>

                                            <div className="robot-card-bottom">

                                                <div className="robot-price">
                                                    <strong>
                                                        {robot.id ===
                                                        "ST-01"
                                                            ? "₹30"
                                                            : "₹20"}
                                                    </strong>

                                                    <span>
                                                        {robot.id ===
                                                        "ST-01"
                                                            ? "/ 30 min"
                                                            : "/ 10 min"}
                                                    </span>
                                                </div>

                                                <button
                                                    className="book-btn"
                                                    onClick={() =>
                                                        handleBookRobot(
                                                            robot
                                                        )
                                                    }
                                                    disabled={
                                                        robot.status !==
                                                        "AVAILABLE"
                                                    }
                                                >
                                                    {robot.status ===
                                                    "AVAILABLE"
                                                        ? "Book Robot"
                                                        : "In Use"}
                                                </button>

                                            </div>

                                        </article>
                                    )
                                )}

                            </div>

                        </section>

                        {/* HOW IT WORKS */}
                        <section
                            id="how-it-works"
                            className="how-section"
                        >

                            <div className="section-heading centered">

                                <span className="section-label">
                                    SIMPLE & SECURE
                                </span>

                                <h2>
                                    How RoboPay works
                                </h2>

                                <p>
                                    A simple booking flow with
                                    blockchain-backed
                                    authorization.
                                </p>

                            </div>

                            <div className="steps-grid">

                                <div className="step-card">
                                    <div className="step-number">
                                        01
                                    </div>

                                    <div className="step-icon">
                                        📱
                                    </div>

                                    <h3>
                                        Scan Robot QR
                                    </h3>

                                    <p>
                                        Scan the QR code attached
                                        to the robot to open its
                                        RoboPay page.
                                    </p>
                                </div>

                                <div className="step-card">
                                    <div className="step-number">
                                        02
                                    </div>

                                    <div className="step-icon">
                                        💳
                                    </div>

                                    <h3>
                                        Make Payment
                                    </h3>

                                    <p>
                                        Select your duration and
                                        complete the payment for
                                        the robotic service.
                                    </p>
                                </div>

                                <div className="step-card">
                                    <div className="step-number">
                                        03
                                    </div>

                                    <div className="step-icon">
                                        ⛓
                                    </div>

                                    <h3>
                                        Blockchain Verified
                                    </h3>

                                    <p>
                                        The verified service
                                        transaction is recorded
                                        on the RoboPay blockchain.
                                    </p>
                                </div>

                                <div className="step-card">
                                    <div className="step-number">
                                        04
                                    </div>

                                    <div className="step-icon">
                                        🤖
                                    </div>

                                    <h3>
                                        Robot Starts
                                    </h3>

                                    <p>
                                        Once authorization is
                                        confirmed, the robot
                                        session begins.
                                    </p>
                                </div>

                            </div>

                        </section>

                    </main>
                </>
            )}

            {/* FOOTER */}
            <footer className="footer">

                <div className="footer-brand">
                    🤖 RoboPay Smart Mall
                </div>

                <p>
                    Blockchain Enabled
                </p>

            </footer>

        </div>
    );
}

export default App;