const customerJourneySteps = [
  "Profile",
  "AI Interview",
  "Coverage Map",
  "Meeting Scheduling"
];

function CustomerJourneyStepper({ activeStep }) {
  return (
    <div className="journey-stepper" aria-label="Customer journey progress">
      {customerJourneySteps.map((step) => (
        <div
          className={`journey-step ${
            step === activeStep ? "journey-step--active" : ""
          }`}
          key={step}
        >
          {step}
        </div>
      ))}
    </div>
  );
}

export default CustomerJourneyStepper;
