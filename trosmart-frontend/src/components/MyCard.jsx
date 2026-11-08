import React from "react";

const MyCard = ({ title, children, style }) => {
  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 16,
            fontWeight: 550,
            marginBottom: 20,
          }}
        >
          {title}
        </div>
      )}

      {children}
    </div>
  );
};

export default MyCard;
