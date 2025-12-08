const mongoose = require("mongoose");

const PredefinedSurveyPeriodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // 12-hour format: "hh:mm AM" or "hh:mm PM"
    from_time: {
      type: String,
      required: true,
      // match: /^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    },

    to_time: {
      type: String,
      required: true,
      // match: /^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

PredefinedSurveyPeriodSchema.index({ project_id: 1 });

/** Convert 12-hour time to minutes after midnight */
// function toMinutes(timeStr) {
//   let [time, period] = timeStr.split(" ");
//   let [h, m] = time.split(":").map(Number);

//   period = period.toUpperCase();

//   // Convert to 24-hour logic
//   if (period === "PM" && h !== 12) h += 12;
//   if (period === "AM" && h === 12) h = 0;

//   return h * 60 + m;
// }

/** Validate time order */
// PredefinedSurveyPeriodSchema.pre("save", function (next) {
//   const fromMinutes = toMinutes(this.from_time);
//   const toMinutesVal = toMinutes(this.to_time);

//   if (fromMinutes >= toMinutesVal) {
//     return next(new Error("From time must be before to time"));
//   }

//   next();
// });

// module.exports = mongoose.model(
//   "PredefinedTimePeriod",
//   PredefinedSurveyPeriodSchema
// );

module.exports =
  mongoose.models.PredefinedTimePeriod ||
  mongoose.model("PredefinedTimePeriod", PredefinedSurveyPeriodSchema);
