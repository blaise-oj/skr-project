import mongoose from "mongoose"
const receiptSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please enter receipt name"],
        },
        quantity: {
            type: Number,
            required: true,
            default: 0,
        },
        weight: {
             type: Number, 
             required: true },

        image: {
            type: String,
            required: false,
        },

        //add status tracking

        status: {
            type: String,
            enum: ['deposited', 'withdrawn', 'in-progress'],
            default: 'deposited'
        },
        depositDate: {
            type: Date,
            default: Date.now
        },


        // ... (your existing fields)
        trackingId: {
            type: String,
            required: true,
            unique: true,
            match: /^[A-Z0-9]{8}$/
            
        },

        withdrawalDate: Date,

        //Add client info

        client: {
            name: String,
            phone: String,
            email: String,
            identification: String
        }

    },

    {
        timestamps: true,
    }
);
const receipt = mongoose.model("receipt", receiptSchema);



export default receipt;

