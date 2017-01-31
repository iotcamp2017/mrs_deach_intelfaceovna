struct RGB
{
	int R;
	int G;
	int B;
};

struct HSL
{
	int H;
	float S;
	float L;
};

float HueToRGB(float v1, float v2, float vH)
{
	if (vH < 0)
		vH += 1;

	if (vH > 1)
		vH -= 1;

	if ((6 * vH) < 1)
		return (v1 + (v2 - v1) * 6 * vH);

	if ((2 * vH) < 1)
		return v2;

	if ((3 * vH) < 2)
		return (v1 + (v2 - v1) * ((2.0f / 3) - vH) * 6);

	return v1;
}

struct RGB HSLToRGB(struct HSL hsl) {
	struct RGB rgb;

	if (hsl.S == 0)
	{
		rgb.R = rgb.G = rgb.B = (unsigned char)(hsl.L * 255);
	}
	else
	{
		float v1, v2;
		float hue = (float)hsl.H / 360;

		v2 = (hsl.L < 0.5) ? (hsl.L * (1 + hsl.S)) : ((hsl.L + hsl.S) - (hsl.L * hsl.S));
		v1 = 2 * hsl.L - v2;

		rgb.R = round(255 * HueToRGB(v1, v2, hue + (1.0f / 3)));
		rgb.G = round(255 * HueToRGB(v1, v2, hue));
		rgb.B = round(255 * HueToRGB(v1, v2, hue - (1.0f / 3)));
	}

	return rgb;
}


struct RGB ConvertRangeToRGB(int num, int lightness){ 
	struct HSL CLR = {round(num/100*360), 100, lightness/100*50};
	
	return HSLToRGB(CLR);
}

int round(float fx)
{
    int ix;
    if(fx<0) ix = (fx-0.5);
    else     ix = (fx+0.5);
    return ix;
}