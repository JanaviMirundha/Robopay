export const ROBO_PAY_CONTRACT =
    "0x05e5c2BD9D9383217C8f54BBdd0D3A6a05457959";

export const ROBO_PAY_ABI = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_paymentRecipient",
                type: "address"
            }
        ],
        stateMutability: "nonpayable",
        type: "constructor"
    },

    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },

    {
        inputs: [],
        name: "paymentRecipient",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "robotId",
                type: "string"
            },
            {
                internalType: "uint256",
                name: "durationMinutes",
                type: "uint256"
            }
        ],
        name: "requiredPayment",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "robotId",
                type: "string"
            },
            {
                internalType: "uint256",
                name: "durationMinutes",
                type: "uint256"
            }
        ],
        name: "requiredAmountInr",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "pure",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "orderId",
                type: "string"
            }
        ],
        name: "getRental",
        outputs: [
            {
                components: [
                    {
                        internalType: "string",
                        name: "orderId",
                        type: "string"
                    },
                    {
                        internalType: "string",
                        name: "robotId",
                        type: "string"
                    },
                    {
                        internalType: "string",
                        name: "service",
                        type: "string"
                    },
                    {
                        internalType: "uint256",
                        name: "durationMinutes",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "amountInr",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "amountPaidWei",
                        type: "uint256"
                    },
                    {
                        internalType: "address",
                        name: "customer",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "startTime",
                        type: "uint256"
                    },
                    {
                        internalType: "bool",
                        name: "active",
                        type: "bool"
                    }
                ],
                internalType: "struct RoboPay.Rental",
                name: "",
                type: "tuple"
            }
        ],
        stateMutability: "view",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "orderId",
                type: "string"
            },
            {
                internalType: "string",
                name: "robotId",
                type: "string"
            },
            {
                internalType: "string",
                name: "service",
                type: "string"
            },
            {
                internalType: "uint256",
                name: "durationMinutes",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "amountInr",
                type: "uint256"
            }
        ],
        name: "rentRobot",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "orderId",
                type: "string"
            }
        ],
        name: "endRental",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "orderId",
                type: "string"
            }
        ],
        name: "refundRental",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "orderId",
                type: "string"
            }
        ],
        name: "completeRentalAndRelease",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },

    {
        inputs: [
            {
                internalType: "address",
                name: "customer",
                type: "address"
            }
        ],
        name: "getCustomerOrders",
        outputs: [
            {
                internalType: "string[]",
                name: "",
                type: "string[]"
            }
        ],
        stateMutability: "view",
        type: "function"
    },

    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "string",
                name: "orderId",
                type: "string"
            },
            {
                indexed: true,
                internalType: "address",
                name: "customer",
                type: "address"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amountRefunded",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "timestamp",
                type: "uint256"
            }
        ],
        name: "RentalRefunded",
        type: "event"
    },

    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "string",
                name: "orderId",
                type: "string"
            },
            {
                indexed: true,
                internalType: "address",
                name: "recipient",
                type: "address"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amountReleased",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "timestamp",
                type: "uint256"
            }
        ],
        name: "EscrowReleased",
        type: "event"
    },

    {
        inputs: [],
        name: "contractBalance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },

    {
        inputs: [],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },

    {
        stateMutability: "payable",
        type: "receive"
    }
];