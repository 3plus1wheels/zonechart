import pandas as pd
import numpy as np

class employee:
    def __init__(self, name, position, mens, womens, cash, fits, stock, greet):
        self.name = name
        self.position = position
        self.mens = mens
        self.womens = womens
        self.cash = cash
        self.fits = fits
        self.stock = stock
        self.greet = greet
        self.info = self.get_info()

    skillRaw = pd.read_excel("data/employee test.xlsx", header = 0)
    skill = skillRaw.copy()
    rows, cols = skill.shape

    def get_info(self):
        return f"Employee Name: {self.name}, Position: {self.position}, Mens: {self.mens}, Womens: {self.womens}, Cash: {self.cash}, Fits: {self.fits}, Stock: {self.stock}, Greet: {self.greet}"
    
    