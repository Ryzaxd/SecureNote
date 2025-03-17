'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notes extends Model {
    static associate(models) {
       Notes.belongsTo(models.Users, {foreignKey: 'user_id', onDelete: 'CASCADE'});
    }
  }
    
  Notes.init({
    title: DataTypes.STRING,
    note: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Notes',
  });
  return Notes;
};