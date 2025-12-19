const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Package = sequelize.define(
    "Package",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      duration: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pricePerPerson: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "per person",
      },
      groupSize: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      rating: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        defaultValue: 0.0,
        validate: {
          min: 0.0,
          max: 5.0,
        },
      },
      highlights: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of package highlight strings",
      },
      included: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Array of what's included in the package",
      },
      type: {
        type: DataTypes.ENUM("All-inclusive", "Full board", "Half board", "Bed & breakfast"),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Whether the package is currently available for booking",
      },
    },
    {
      tableName: "packages",
      timestamps: true,
      indexes: [
        {
          fields: ["type"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["rating"],
        },
      ],
    }
  );

  return Package;
};
